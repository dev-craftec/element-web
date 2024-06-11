import classNames from "classnames";
import React, { PropsWithChildren } from "react";

interface Props {
    className?: string;
    flex?: boolean;
}

export default function AuthBody({ flex, className, children }: PropsWithChildren<Props>): JSX.Element {
    return <main className={classNames("mx_AuthBody", className, { mx_AuthBody_flex: flex })}>{children}</main>;
}
