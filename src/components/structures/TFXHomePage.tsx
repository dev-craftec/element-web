import * as React from "react";

import AutoHideScrollbar from "matrix-react-sdk/src/components/structures/AutoHideScrollbar";
import { getHomePageUrl } from "matrix-react-sdk/src/utils/pages";
import { _tDom } from "matrix-react-sdk/src/languageHandler";
import SdkConfig from "matrix-react-sdk/src/SdkConfig";
import { useMatrixClientContext } from "matrix-react-sdk/src/contexts/MatrixClientContext";
import EmbeddedPage from "matrix-react-sdk/src/components/structures/EmbeddedPage";

console.log("Loaded TFXHomePage");

interface IProps {
    justRegistered?: boolean;
}

const HomePage: React.FC<IProps> = () => {
    const cli = useMatrixClientContext();
    const config = SdkConfig.get();
    const pageUrl = getHomePageUrl(config, cli);

    if (pageUrl) {
        return <EmbeddedPage className="mx_HomePage" url={pageUrl} scrollbar={true} />;
    }

    const brandingConfig = SdkConfig.getObject("branding");
    const logoUrl = brandingConfig?.get("auth_header_logo_url") ?? "themes/element/img/logos/element-logo.svg";

    return (
        <AutoHideScrollbar className="mx_HomePage mx_HomePage_default" element="main">
            <div className="mx_HomePage_default_wrapper">
                <React.Fragment>
                    <img src={logoUrl} alt={config.brand} />
                    <h1>{_tDom("onboarding|intro_welcome", { appName: config.brand })}</h1>
                </React.Fragment>
            </div>
        </AutoHideScrollbar>
    );
};

export default HomePage;
