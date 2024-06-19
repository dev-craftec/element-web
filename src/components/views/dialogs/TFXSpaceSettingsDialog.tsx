import React from "react";
import { Room, MatrixClient } from "matrix-js-sdk/src/matrix";
import { _t } from "matrix-react-sdk/src/languageHandler";
import BaseDialog from "matrix-react-sdk/src/components/views/dialogs/BaseDialog";
import defaultDispatcher from "matrix-react-sdk/src/dispatcher/dispatcher";
import { useDispatcher } from "matrix-react-sdk/src/hooks/useDispatcher";
import TabbedView from "matrix-react-sdk/src/components/structures/TabbedView";
import { Action } from "matrix-react-sdk/src/dispatcher/actions";

console.log("Loaded TFXSpaceSettingsDialog");

export enum SpaceSettingsTab {
    General = "SPACE_GENERAL_TAB",
    Visibility = "SPACE_VISIBILITY_TAB",
    Roles = "SPACE_ROLES_TAB",
    Advanced = "SPACE_ADVANCED_TAB",
}

interface IProps {
    matrixClient: MatrixClient;
    space: Room;
    onFinished(): void;
}

const SpaceSettingsDialog: React.FC<IProps> = ({ matrixClient: cli, space, onFinished }) => {
    useDispatcher(defaultDispatcher, (payload) => {
        if (payload.action === Action.AfterLeaveRoom && payload.room_id === space.roomId) {
            onFinished();
        }
    });

    const [activeTabId, setActiveTabId] = React.useState(SpaceSettingsTab.General);

    return (
        <BaseDialog
            title={_t("space_settings|title", { spaceName: space.name || _t("common|unnamed_space") })}
            className="mx_SpaceSettingsDialog"
            contentId="mx_SpaceSettingsDialog"
            onFinished={onFinished}
            fixedWidth={false}
        >
            <div className="mx_SpaceSettingsDialog_content" id="mx_SpaceSettingsDialog">
                <TabbedView tabs={[]} activeTabId={activeTabId} onChange={setActiveTabId} />
            </div>
        </BaseDialog>
    );
};

export default SpaceSettingsDialog;
