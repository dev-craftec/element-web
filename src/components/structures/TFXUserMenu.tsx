import React, { createRef, ReactNode } from "react";
import { discoverAndValidateOIDCIssuerWellKnown, Room } from "matrix-js-sdk/src/matrix";

import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import defaultDispatcher from "matrix-react-sdk/src/dispatcher/dispatcher";
import { ActionPayload } from "matrix-react-sdk/src/dispatcher/payloads";
import { Action } from "matrix-react-sdk/src/dispatcher/actions";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { ChevronFace, ContextMenuButton, MenuProps } from "matrix-react-sdk/src/components/structures/ContextMenu";
import { UserTab } from "matrix-react-sdk/src/components/views/dialogs/UserTab";
import { OpenToTabPayload } from "matrix-react-sdk/src/dispatcher/payloads/OpenToTabPayload";
import FeedbackDialog from "matrix-react-sdk/src/components/views/dialogs/FeedbackDialog";
import Modal from "matrix-react-sdk/src/Modal";
import SettingsStore from "matrix-react-sdk/src/settings/SettingsStore";
import { findHighContrastTheme, getCustomTheme, isHighContrastTheme } from "matrix-react-sdk/src/theme";
import { RovingAccessibleButton } from "matrix-react-sdk/src/accessibility/RovingTabIndex";
import AccessibleButton, { ButtonEvent } from "matrix-react-sdk/src/components/views/elements/AccessibleButton";
import SdkConfig from "matrix-react-sdk/src/SdkConfig";
import { getHomePageUrl } from "matrix-react-sdk/src/utils/pages";
import { OwnProfileStore } from "matrix-react-sdk/src/stores/OwnProfileStore";
import { UPDATE_EVENT } from "matrix-react-sdk/src/stores/AsyncStore";
import BaseAvatar from "matrix-react-sdk/src/components/views/avatars/BaseAvatar";
import { SettingLevel } from "matrix-react-sdk/src/settings/SettingLevel";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "matrix-react-sdk/src/components/views/context_menus/IconizedContextMenu";
import { UIFeature } from "matrix-react-sdk/src/settings/UIFeature";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { UPDATE_SELECTED_SPACE } from "matrix-react-sdk/src/stores/spaces";
import UserIdentifierCustomisations from "matrix-react-sdk/src/customisations/UserIdentifier";
import PosthogTrackers from "matrix-react-sdk/src/PosthogTrackers";
import { ViewHomePagePayload } from "matrix-react-sdk/src/dispatcher/payloads/ViewHomePagePayload";
import { Icon as LiveIcon } from "matrix-react-sdk/res/img/compound/live-8px.svg";
import { VoiceBroadcastRecording, VoiceBroadcastRecordingsStoreEvent } from "matrix-react-sdk/src/voice-broadcast";
import { SDKContext } from "matrix-react-sdk/src/contexts/SDKContext";
import { shouldShowFeedback } from "matrix-react-sdk/src/utils/Feedback";
import { shouldShowQr } from "matrix-react-sdk/src/components/views/settings/devices/LoginWithQRSection";
import { Features } from "matrix-react-sdk/src/settings/Settings";

console.log("Loaded TFXUserMenu");

interface IProps {
    isPanelCollapsed: boolean;
    children?: ReactNode;
}

type PartialDOMRect = Pick<DOMRect, "width" | "left" | "top" | "height">;

interface IState {
    contextMenuPosition: PartialDOMRect | null;
    isDarkTheme: boolean;
    isHighContrast: boolean;
    selectedSpace?: Room | null;
    showLiveAvatarAddon: boolean;
    showQrLogin: boolean;
    supportsQrLogin: boolean;
}

const toRightOf = (rect: PartialDOMRect): MenuProps => {
    return {
        left: rect.width + rect.left + 8,
        top: rect.top,
        chevronFace: ChevronFace.None,
    };
};

const below = (rect: PartialDOMRect): MenuProps => {
    return {
        left: rect.left,
        top: rect.top + rect.height,
        chevronFace: ChevronFace.None,
    };
};

export default class UserMenu extends React.Component<IProps, IState> {
    public static contextType = SDKContext;
    public context!: React.ContextType<typeof SDKContext>;

    private dispatcherRef?: string;
    private themeWatcherRef?: string;
    private readonly dndWatcherRef?: string;
    private buttonRef: React.RefObject<HTMLButtonElement> = createRef();

    public constructor(props: IProps, context: React.ContextType<typeof SDKContext>) {
        super(props, context);

        this.context = context;
        this.state = {
            contextMenuPosition: null,
            isDarkTheme: this.isUserOnDarkTheme(),
            isHighContrast: this.isUserOnHighContrastTheme(),
            selectedSpace: SpaceStore.instance.activeSpaceRoom,
            showLiveAvatarAddon: this.context.voiceBroadcastRecordingsStore.hasCurrent(),
            showQrLogin: false,
            supportsQrLogin: false,
        };

        OwnProfileStore.instance.on(UPDATE_EVENT, this.onProfileUpdate);
        SpaceStore.instance.on(UPDATE_SELECTED_SPACE, this.onSelectedSpaceUpdate);
    }

    private get hasHomePage(): boolean {
        return !!getHomePageUrl(SdkConfig.get(), this.context.client!);
    }

    private onCurrentVoiceBroadcastRecordingChanged = (recording: VoiceBroadcastRecording | null): void => {
        this.setState({
            showLiveAvatarAddon: recording !== null,
        });
    };

    public componentDidMount(): void {
        this.context.voiceBroadcastRecordingsStore.on(
            VoiceBroadcastRecordingsStoreEvent.CurrentChanged,
            this.onCurrentVoiceBroadcastRecordingChanged,
        );
        this.dispatcherRef = defaultDispatcher.register(this.onAction);
        this.themeWatcherRef = SettingsStore.watchSetting("theme", null, this.onThemeChanged);
        this.checkQrLoginSupport();
    }

    public componentWillUnmount(): void {
        if (this.themeWatcherRef) SettingsStore.unwatchSetting(this.themeWatcherRef);
        if (this.dndWatcherRef) SettingsStore.unwatchSetting(this.dndWatcherRef);
        if (this.dispatcherRef) defaultDispatcher.unregister(this.dispatcherRef);
        OwnProfileStore.instance.off(UPDATE_EVENT, this.onProfileUpdate);
        SpaceStore.instance.off(UPDATE_SELECTED_SPACE, this.onSelectedSpaceUpdate);
        this.context.voiceBroadcastRecordingsStore.off(
            VoiceBroadcastRecordingsStoreEvent.CurrentChanged,
            this.onCurrentVoiceBroadcastRecordingChanged,
        );
    }

    private checkQrLoginSupport = async (): Promise<void> => {
        if (!this.context.client || !SettingsStore.getValue(Features.OidcNativeFlow)) return;

        const { issuer } = await this.context.client.getAuthIssuer().catch(() => ({ issuer: undefined }));
        if (issuer) {
            const [oidcClientConfig, versions, wellKnown, isCrossSigningReady] = await Promise.all([
                discoverAndValidateOIDCIssuerWellKnown(issuer),
                this.context.client.getVersions(),
                this.context.client.waitForClientWellKnown(),
                this.context.client.getCrypto()?.isCrossSigningReady(),
            ]);

            const supportsQrLogin = shouldShowQr(
                this.context.client,
                !!isCrossSigningReady,
                oidcClientConfig,
                versions,
                wellKnown,
            );
            this.setState({ supportsQrLogin, showQrLogin: true });
        }
    };

    private isUserOnDarkTheme(): boolean {
        if (SettingsStore.getValue("use_system_theme")) {
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        } else {
            const theme = SettingsStore.getValue("theme");
            if (theme.startsWith("custom-")) {
                return !!getCustomTheme(theme.substring("custom-".length)).is_dark;
            }
            return theme === "dark";
        }
    }

    private isUserOnHighContrastTheme(): boolean {
        if (SettingsStore.getValue("use_system_theme")) {
            return window.matchMedia("(prefers-contrast: more)").matches;
        } else {
            const theme = SettingsStore.getValue("theme");
            if (theme.startsWith("custom-")) {
                return false;
            }
            return isHighContrastTheme(theme);
        }
    }

    private onProfileUpdate = async (): Promise<void> => {
        // the store triggered an update, so force a layout update. We don't
        // have any state to store here for that to magically happen.
        this.forceUpdate();
    };

    private onSelectedSpaceUpdate = async (): Promise<void> => {
        this.setState({
            selectedSpace: SpaceStore.instance.activeSpaceRoom,
        });
    };

    private onThemeChanged = (): void => {
        this.setState({
            isDarkTheme: this.isUserOnDarkTheme(),
            isHighContrast: this.isUserOnHighContrastTheme(),
        });
    };

    private onAction = (payload: ActionPayload): void => {
        switch (payload.action) {
            case Action.ToggleUserMenu:
                if (this.state.contextMenuPosition) {
                    this.setState({ contextMenuPosition: null });
                } else {
                    if (this.buttonRef.current) this.buttonRef.current.click();
                }
                break;
        }
    };

    private onOpenMenuClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({ contextMenuPosition: ev.currentTarget.getBoundingClientRect() });
    };

    private onContextMenu = (ev: React.MouseEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            contextMenuPosition: {
                left: ev.clientX,
                top: ev.clientY,
                width: 20,
                height: 0,
            },
        });
    };

    private onCloseMenu = (): void => {
        this.setState({ contextMenuPosition: null });
    };

    private onSwitchThemeClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();

        PosthogTrackers.trackInteraction("WebUserMenuThemeToggleButton", ev);

        // Disable system theme matching if the user hits this button
        SettingsStore.setValue("use_system_theme", null, SettingLevel.DEVICE, false);

        let newTheme = this.state.isDarkTheme ? "light" : "dark";
        if (this.state.isHighContrast) {
            const hcTheme = findHighContrastTheme(newTheme);
            if (hcTheme) {
                newTheme = hcTheme;
            }
        }
        SettingsStore.setValue("theme", null, SettingLevel.DEVICE, newTheme); // set at same level as Appearance tab
    };

    private onSettingsOpen = (ev: ButtonEvent, tabId?: string, props?: Record<string, any>): void => {
        ev.preventDefault();
        ev.stopPropagation();

        const payload: OpenToTabPayload = { action: Action.ViewUserSettings, initialTabId: tabId, props };
        defaultDispatcher.dispatch(payload);
        this.setState({ contextMenuPosition: null }); // also close the menu
    };

    private onProvideFeedback = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();

        Modal.createDialog(FeedbackDialog);
        this.setState({ contextMenuPosition: null }); // also close the menu
    };

    private onSignInClick = (): void => {
        defaultDispatcher.dispatch({ action: "start_login" });
        this.setState({ contextMenuPosition: null }); // also close the menu
    };

    private onRegisterClick = (): void => {
        defaultDispatcher.dispatch({ action: "start_registration" });
        this.setState({ contextMenuPosition: null }); // also close the menu
    };

    private onHomeClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();

        defaultDispatcher.dispatch<ViewHomePagePayload>({ action: Action.ViewHomePage });
        this.setState({ contextMenuPosition: null }); // also close the menu
    };

    private renderContextMenu = (): React.ReactNode => {
        if (!this.state.contextMenuPosition) return null;

        let topSection: JSX.Element | undefined;
        if (MatrixClientPeg.safeGet().isGuest()) {
            topSection = (
                <div className="mx_UserMenu_contextMenu_header mx_UserMenu_contextMenu_guestPrompts">
                    {_t(
                        "auth|sign_in_prompt",
                        {},
                        {
                            a: (sub) => (
                                <AccessibleButton kind="link_inline" onClick={this.onSignInClick}>
                                    {sub}
                                </AccessibleButton>
                            ),
                        },
                    )}
                    {SettingsStore.getValue(UIFeature.Registration)
                        ? _t(
                              "auth|create_account_prompt",
                              {},
                              {
                                  a: (sub) => (
                                      <AccessibleButton kind="link_inline" onClick={this.onRegisterClick}>
                                          {sub}
                                      </AccessibleButton>
                                  ),
                              },
                          )
                        : null}
                </div>
            );
        }

        let homeButton: JSX.Element | undefined;
        if (this.hasHomePage) {
            homeButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_UserMenu_iconHome"
                    label={_t("common|home")}
                    onClick={this.onHomeClick}
                />
            );
        }

        let feedbackButton: JSX.Element | undefined;
        if (shouldShowFeedback()) {
            feedbackButton = (
                <IconizedContextMenuOption
                    iconClassName="mx_UserMenu_iconMessage"
                    label={_t("common|feedback")}
                    onClick={this.onProvideFeedback}
                />
            );
        }

        let linkNewDeviceButton: JSX.Element | undefined;
        if (this.state.showQrLogin) {
            const extraProps: Omit<
                React.ComponentProps<typeof IconizedContextMenuOption>,
                "iconClassname" | "label" | "onClick"
            > = {};
            if (!this.state.supportsQrLogin) {
                extraProps.disabled = true;
                extraProps.title = _t("user_menu|link_new_device_not_supported");
                extraProps.caption = _t("user_menu|link_new_device_not_supported_caption");
                extraProps.placement = "right";
            }

            linkNewDeviceButton = (
                <IconizedContextMenuOption
                    {...extraProps}
                    iconClassName="mx_UserMenu_iconQr"
                    label={_t("user_menu|link_new_device")}
                    onClick={(e) => this.onSettingsOpen(e, UserTab.SessionManager, { showMsc4108QrCode: true })}
                />
            );
        }

        let primaryOptionList = (
            <IconizedContextMenuOptionList>
                {homeButton}
                {linkNewDeviceButton}
                <IconizedContextMenuOption
                    iconClassName="mx_UserMenu_iconBell"
                    label={_t("notifications|enable_prompt_toast_title")}
                    onClick={(e) => this.onSettingsOpen(e, UserTab.Notifications)}
                />
                <IconizedContextMenuOption
                    iconClassName="mx_UserMenu_iconSettings"
                    label={_t("user_menu|settings")}
                    onClick={(e) => this.onSettingsOpen(e)}
                />
            </IconizedContextMenuOptionList>
        );

        if (MatrixClientPeg.safeGet().isGuest()) {
            primaryOptionList = (
                <IconizedContextMenuOptionList>
                    {homeButton}
                    <IconizedContextMenuOption
                        iconClassName="mx_UserMenu_iconSettings"
                        label={_t("common|settings")}
                        onClick={(e) => this.onSettingsOpen(e)}
                    />
                    {feedbackButton}
                </IconizedContextMenuOptionList>
            );
        }

        const position = this.props.isPanelCollapsed
            ? toRightOf(this.state.contextMenuPosition)
            : below(this.state.contextMenuPosition);

        return (
            <IconizedContextMenu {...position} onFinished={this.onCloseMenu} className="mx_UserMenu_contextMenu">
                <div className="mx_UserMenu_contextMenu_header">
                    <div className="mx_UserMenu_contextMenu_name">
                        <span className="mx_UserMenu_contextMenu_displayName">
                            {OwnProfileStore.instance.displayName}
                        </span>
                        <span className="mx_UserMenu_contextMenu_userId">
                            {UserIdentifierCustomisations.getDisplayUserIdentifier(
                                MatrixClientPeg.safeGet().getSafeUserId(),
                                {
                                    withDisplayName: true,
                                },
                            )}
                        </span>
                    </div>

                    <RovingAccessibleButton
                        className="mx_UserMenu_contextMenu_themeButton"
                        onClick={this.onSwitchThemeClick}
                        title={
                            this.state.isDarkTheme
                                ? _t("user_menu|switch_theme_light")
                                : _t("user_menu|switch_theme_dark")
                        }
                    >
                        <img
                            src={require("matrix-react-sdk/res/img/element-icons/roomlist/dark-light-mode.svg").default}
                            role="presentation"
                            alt=""
                            width={16}
                        />
                    </RovingAccessibleButton>
                </div>
                {topSection}
                {primaryOptionList}
            </IconizedContextMenu>
        );
    };

    public render(): React.ReactNode {
        const avatarSize = 32; // should match border-radius of the avatar

        const userId = MatrixClientPeg.safeGet().getSafeUserId();
        const displayName = OwnProfileStore.instance.displayName || userId;
        const avatarUrl = OwnProfileStore.instance.getHttpAvatarUrl(avatarSize);

        let name: JSX.Element | undefined;
        if (!this.props.isPanelCollapsed) {
            name = <div className="mx_UserMenu_name">{displayName}</div>;
        }

        const liveAvatarAddon = this.state.showLiveAvatarAddon ? (
            <div className="mx_UserMenu_userAvatarLive" data-testid="user-menu-live-vb">
                <LiveIcon className="mx_Icon_8" />
            </div>
        ) : null;

        return (
            <div className="mx_UserMenu">
                <ContextMenuButton
                    className="mx_UserMenu_contextMenuButton"
                    onClick={this.onOpenMenuClick}
                    ref={this.buttonRef}
                    label={_t("a11y|user_menu")}
                    isExpanded={!!this.state.contextMenuPosition}
                    onContextMenu={this.onContextMenu}
                >
                    <div className="mx_UserMenu_userAvatar">
                        <BaseAvatar
                            idName={userId}
                            name={displayName}
                            url={avatarUrl}
                            size={avatarSize + "px"}
                            className="mx_UserMenu_userAvatar_BaseAvatar"
                        />
                        {liveAvatarAddon}
                    </div>
                    {name}
                    {this.renderContextMenu()}
                </ContextMenuButton>

                {this.props.children}
            </div>
        );
    }
}
