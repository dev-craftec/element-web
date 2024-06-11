import classNames from "classnames";
import React, { PropsWithChildren } from "react";

interface Props {
    className?: string;
    flex?: boolean;
}

export default function TFXAuthBody({ flex, className, children }: PropsWithChildren<Props>): JSX.Element {
    const style: React.CSSProperties = {
        borderRadius: "4px",
    };

    return (
        <main className={classNames("mx_AuthBody", className, { mx_AuthBody_flex: flex })} style={style}>
            {children}
        </main>
    );
}
