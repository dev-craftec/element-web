import * as React from "react";
import SdkConfig from "matrix-react-sdk/src/SdkConfig";

import VectorAuthFooter from "./VectorAuthFooter";

export default class VectorAuthPage extends React.PureComponent {
    public render(): React.ReactElement {
        const modalStyle: React.CSSProperties = {
            position: "relative",
            background: "initial",
        };

        const modalContentStyle: React.CSSProperties = {
            display: "flex",
            zIndex: 1,
            background: "rgba(255, 255, 255, 0.59)",
            borderRadius: "8px",
        };

        return (
            <div className="mx_AuthPage">
                <div className="mx_AuthPage_modal" style={modalStyle}>
                    <div className="mx_AuthPage_modalBlur" />
                    <div className="mx_AuthPage_modalContent" style={modalContentStyle}>
                        {this.props.children}
                    </div>
                </div>
                <VectorAuthFooter />
            </div>
        );
    }
}
