// Dev note: this customisation point is heavily inspired by UIFeature flags, though
// with an intention of being used for more complex switching on whether or not a feature
// should be shown.

// Populate this class with the details of your customisations when copying it.

import { UIComponent } from "matrix-react-sdk/src/settings/UIFeature";

/**
 * Determines whether or not the active MatrixClient user should be able to use
 * the given UI component. If shown, the user might still not be able to use the
 * component depending on their contextual permissions. For example, invite options
 * might be shown to the user but they won't have permission to invite users to
 * the current room: the button will appear disabled.
 * @param {UIComponent} component The component to check visibility for.
 * @returns {boolean} True (default) if the user is able to see the component, false
 * otherwise.
 */
function shouldShowComponent(component: UIComponent): boolean {
    if (component === UIComponent.InviteUsers) return false;
    if (component === UIComponent.CreateRooms) return false;
    if (component === UIComponent.CreateSpaces) return false;
    if (component === UIComponent.ExploreRooms) return false;
    if (component === UIComponent.AddIntegrations) return false;
    if (component === UIComponent.FilterContainer) return false;
    if (component === UIComponent.RoomOptionsMenu) return false;
    console.log("shouldShowComponent", component);
    return true;
}

// This interface summarises all available customisation points and also marks
// them all as optional. This allows customisers to only define and export the
// customisations they need while still maintaining type safety.
export interface IComponentVisibilityCustomisations {
    shouldShowComponent?: typeof shouldShowComponent;
}

// A real customisation module will define and export one or more of the
// customisation points that make up the interface above.
export const ComponentVisibilityCustomisations: IComponentVisibilityCustomisations = {
    // while we don't specify the functions here, their defaults are described
    // in their pseudo-implementations above.
    shouldShowComponent,
};
