import * as Lifecycle from "matrix-react-sdk/src/Lifecycle";
import { IMatrixClientCreds } from "matrix-react-sdk/src/MatrixClientPeg";

function onLoggedOutAndStorageCleared(): void {
    // E.g. redirect user or call other APIs after logout
    console.log("[IFrame] Listening for messages");
    const handleMessage = (event: MessageEvent): void => {
        if (event.origin !== "https://vagrant.tfx.com") return;
        console.log("[IFrame] Received event", event);
        if (typeof event.data === "string") {
            parent.postMessage("I've got the API key", "*");
            window.removeEventListener("message", handleMessage);
            const data = JSON.parse(event.data) as IMatrixClientCreds;
            Lifecycle.setLoggedIn(data);
            // window.mxLoginWithAccessToken(data.homeserverUrl, data.accessToken);
        }
    };
    window.addEventListener("message", handleMessage);
    console.log("[IFrame] Sending Hello message to Host");
    parent.postMessage("Hello Host", "*");
}

// This interface summarises all available customisation points and also marks
// them all as optional. This allows customisers to only define and export the
// customisations they need while still maintaining type safety.
export interface ILifecycleCustomisations {
    onLoggedOutAndStorageCleared?: typeof onLoggedOutAndStorageCleared;
}

// A real customisation module will define and export one or more of the
// customisation points that make up `ILifecycleCustomisations`.
export default {
    onLoggedOutAndStorageCleared
} as ILifecycleCustomisations;
