import { Toast } from "@vector-im/compound-web";
import React from "react";
import TabbedView, { Tab, useActiveTabWithDefault } from "matrix-react-sdk/src/components/structures/TabbedView";
import { _t, _td } from "matrix-react-sdk/src/languageHandler";
import AppearanceUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/AppearanceUserSettingsTab";
import NotificationUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/NotificationUserSettingsTab";
import PreferencesUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/PreferencesUserSettingsTab";
import VoiceUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/VoiceUserSettingsTab";
import HelpUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/HelpUserSettingsTab";
import MjolnirUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/MjolnirUserSettingsTab";
import { UIFeature } from "matrix-react-sdk/src/settings/UIFeature";
import BaseDialog from "matrix-react-sdk/src/components/views/dialogs/BaseDialog";
import SidebarUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/SidebarUserSettingsTab";
import KeyboardUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/KeyboardUserSettingsTab";
import { UserTab } from "matrix-react-sdk/src/components/views/dialogs/UserTab";
import { NonEmptyArray } from "matrix-react-sdk/src/@types/common";
import { SDKContext, SdkContextClass } from "matrix-react-sdk/src/contexts/SDKContext";
import { useSettingValue } from "matrix-react-sdk/src/hooks/useSettings";
import { ToastContext, useActiveToast } from "matrix-react-sdk/src/contexts/ToastContext";

console.log("Loaded TFXUserSettingsDialog");

interface IProps {
    initialTabId?: UserTab;
    showMsc4108QrCode?: boolean;
    sdkContext: SdkContextClass;
    onFinished(): void;
}

function titleForTabID(tabId: UserTab): React.ReactNode {
    const subs = {
        strong: (sub: string) => <strong>{sub}</strong>,
    };
    switch (tabId) {
        case UserTab.Appearance:
            return _t("settings|appearance|dialog_title", undefined, subs);
        case UserTab.Notifications:
            return _t("settings|notifications|dialog_title", undefined, subs);
        case UserTab.Preferences:
            return _t("settings|preferences|dialog_title", undefined, subs);
        case UserTab.Keyboard:
            return _t("settings|keyboard|dialog_title", undefined, subs);
        case UserTab.Sidebar:
            return _t("settings|sidebar|dialog_title", undefined, subs);
        case UserTab.Voice:
            return _t("settings|voip|dialog_title", undefined, subs);
        case UserTab.Mjolnir:
            return _t("settings|labs_mjolnir|dialog_title", undefined, subs);
        case UserTab.Help:
            return _t("setting|help_about|dialog_title", undefined, subs);
    }
}

export default function UserSettingsDialog(props: IProps): JSX.Element {
    const voipEnabled = useSettingValue<boolean>(UIFeature.Voip);
    const mjolnirEnabled = useSettingValue<boolean>("feature_mjolnir");

    const getTabs = (): NonEmptyArray<Tab<UserTab>> => {
        const tabs: Tab<UserTab>[] = [];

        tabs.push(
            new Tab(
                UserTab.Appearance,
                _td("common|appearance"),
                "mx_UserSettingsDialog_appearanceIcon",
                <AppearanceUserSettingsTab />,
                "UserSettingsAppearance",
            ),
        );
        tabs.push(
            new Tab(
                UserTab.Notifications,
                _td("notifications|enable_prompt_toast_title"),
                "mx_UserSettingsDialog_bellIcon",
                <NotificationUserSettingsTab />,
                "UserSettingsNotifications",
            ),
        );
        tabs.push(
            new Tab(
                UserTab.Preferences,
                _td("common|preferences"),
                "mx_UserSettingsDialog_preferencesIcon",
                <PreferencesUserSettingsTab closeSettingsFn={props.onFinished} />,
                "UserSettingsPreferences",
            ),
        );
        tabs.push(
            new Tab(
                UserTab.Keyboard,
                _td("settings|keyboard|title"),
                "mx_UserSettingsDialog_keyboardIcon",
                <KeyboardUserSettingsTab />,
                "UserSettingsKeyboard",
            ),
        );
        tabs.push(
            new Tab(
                UserTab.Sidebar,
                _td("settings|sidebar|title"),
                "mx_UserSettingsDialog_sidebarIcon",
                <SidebarUserSettingsTab />,
                "UserSettingsSidebar",
            ),
        );

        if (voipEnabled) {
            tabs.push(
                new Tab(
                    UserTab.Voice,
                    _td("settings|voip|title"),
                    "mx_UserSettingsDialog_voiceIcon",
                    <VoiceUserSettingsTab />,
                    "UserSettingsVoiceVideo",
                ),
            );
        }

        if (mjolnirEnabled) {
            tabs.push(
                new Tab(
                    UserTab.Mjolnir,
                    _td("labs_mjolnir|title"),
                    "mx_UserSettingsDialog_mjolnirIcon",
                    <MjolnirUserSettingsTab />,
                    "UserSettingMjolnir",
                ),
            );
        }
        tabs.push(
            new Tab(
                UserTab.Help,
                _td("setting|help_about|title"),
                "mx_UserSettingsDialog_helpIcon",
                <HelpUserSettingsTab />,
                "UserSettingsHelpAbout",
            ),
        );

        return tabs as NonEmptyArray<Tab<UserTab>>;
    };

    const [activeTabId, _setActiveTabId] = useActiveTabWithDefault(getTabs(), UserTab.Appearance, props.initialTabId);
    const setActiveTabId = (tabId: UserTab): void => {
        _setActiveTabId(tabId);
        // Clear this so switching away from the tab and back to it will not show the QR code again
        setShowMsc4108QrCode(false);
    };

    const [activeToast, toastRack] = useActiveToast();

    return (
        // XXX: SDKContext is provided within the LoggedInView subtree.
        // Modals function outside the MatrixChat React tree, so sdkContext is reprovided here to simulate that.
        // The longer term solution is to move our ModalManager into the React tree to inherit contexts properly.
        <SDKContext.Provider value={props.sdkContext}>
            <ToastContext.Provider value={toastRack}>
                <BaseDialog
                    className="mx_UserSettingsDialog"
                    hasCancel={true}
                    onFinished={props.onFinished}
                    title={titleForTabID(activeTabId)}
                >
                    <div className="mx_SettingsDialog_content">
                        <TabbedView
                            tabs={getTabs()}
                            activeTabId={activeTabId}
                            screenName="UserSettings"
                            onChange={setActiveTabId}
                            responsive={true}
                        />
                    </div>
                    <div className="mx_SettingsDialog_toastContainer">
                        {activeToast && <Toast>{activeToast}</Toast>}
                    </div>
                </BaseDialog>
            </ToastContext.Provider>
        </SDKContext.Provider>
    );
}
