import React from "react";
import { CryptoEvent, MatrixClient } from "matrix-js-sdk/src/matrix";
import { messageForSyncError } from "matrix-react-sdk/src/utils/ErrorUtils";
import Spinner from "matrix-react-sdk/src/components/views/elements/Spinner";
import ProgressBar from "matrix-react-sdk/src/components/views/elements/ProgressBar";
import { ButtonEvent } from "matrix-react-sdk/src/components/views/elements/AccessibleButton";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { useTypedEventEmitterState } from "matrix-react-sdk/src/hooks/useEventEmitter";
import SdkConfig from "matrix-react-sdk/src/SdkConfig";

console.log("Loaded TFXLoginSplashView");

interface Props {
    /** The matrix client which is logging in */
    matrixClient: MatrixClient;

    /**
     * A callback function. Will be called if the user clicks the "logout" button on the splash screen.
     *
     * @param event - The click event
     */
    onLogoutClick: (event: ButtonEvent) => void;

    /**
     * Error that caused `/sync` to fail. If set, an error message will be shown on the splash screen.
     */
    syncError: Error | null;
}

type MigrationState = {
    progress: number;
    totalSteps: number;
};

/**
 * The view that is displayed after we have logged in, before the first /sync is completed.
 */
export function LoginSplashView(props: Props): React.JSX.Element {
    const migrationState = useTypedEventEmitterState(
        props.matrixClient,
        CryptoEvent.LegacyCryptoStoreMigrationProgress,
        (progress?: number, total?: number): MigrationState => ({ progress: progress ?? -1, totalSteps: total ?? -1 }),
    );
    let errorBox: React.JSX.Element | undefined;
    if (props.syncError) {
        errorBox = <div className="mx_LoginSplashView_syncError">{messageForSyncError(props.syncError)}</div>;
    }

    // If we are migrating the crypto data, show a progress bar. Otherwise, show a normal spinner.
    let spinnerOrProgress;
    if (migrationState.totalSteps !== -1) {
        spinnerOrProgress = (
            <div className="mx_LoginSplashView_migrationProgress">
                <p>{_t("migrating_crypto", { brand: SdkConfig.get().brand })}</p>
                <ProgressBar value={migrationState.progress} max={migrationState.totalSteps} />
            </div>
        );
    } else {
        spinnerOrProgress = <Spinner />;
    }

    return (
        <div className="mx_MatrixChat_splash">
            {errorBox}
            {spinnerOrProgress}
        </div>
    );
}
