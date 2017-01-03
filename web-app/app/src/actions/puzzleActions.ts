import { Dispatch } from "redux";
import * as firebase from "firebase";

import { firebaseDatabase } from "../auth";
import { IAppState, IDiscoveredPage } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_DISCOVERED_PUZZLES_ACTION = "LOAD_DISCOVERED_PUZZLES";
export function loadDiscoveredPagesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION));
        firebaseDatabase
            .ref(`discoveredPages/${huntKey}`)
            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                let discoveredPages: IDiscoveredPage[] = [];
                snapshot.forEach((discoveredPageSnapshot: firebase.database.DataSnapshot) => {
                    discoveredPages.push(discoveredPageSnapshot.val());
                });
                dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION, discoveredPages));
            }, (error: Error) => {
                asyncActionFailedPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION, error);
            });
    };
}
