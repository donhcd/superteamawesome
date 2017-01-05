import { Dispatch } from "redux";

import { firebaseAuth, firebaseDatabase } from "../auth";
import { IAppState, IHuntState } from "../state";
import { getAccessToken, LOGIN_ACTION, ILoginActionPayload } from "./authActions";
import { loadFolder, loadGoogleApi } from "./googleActions";

import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_HUNT_ACTION = "LOAD_HUNT";
export interface IHunt {
    host: string;
    isCurrent: boolean;
    name: string;
    titleRegex?: string;
}

export interface ILoadHuntActionPayload extends IHunt {
    year: number;
}

export function loadHuntAndUserInfoAction() {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION));
        let authPromise: Promise<firebase.UserInfo>;
        
        const { auth } = getState();
        const isLoggedIn = auth.user !== undefined;

        if (!isLoggedIn) {
            dispatch(asyncActionInProgressPayload<ILoginActionPayload>(LOGIN_ACTION));
            authPromise = new Promise((resolve) => {
                firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => resolve(user));
            });
        } else {
            authPromise = new Promise((resolve) => resolve(auth.user));
        }

        let user: firebase.UserInfo;
        let accessToken: string;
        authPromise
            .then((firebaseUser: firebase.UserInfo) => {
                user = firebaseUser;

                if (isLoggedIn) {
                    return new Promise((resolve) => resolve(auth.googleToken));
                } else {
                    return getAccessToken(user.uid);
                }
            })
            .then((googleAccessToken: string) => {
                if (!isLoggedIn) {
                    accessToken = googleAccessToken;
                    return loadGoogleApi(accessToken, (user as any).refreshToken);
                } else {
                    return new Promise((resolve) => resolve());
                }
            })
            .then(() => {
                if (!isLoggedIn) {
                    dispatch(asyncActionSucceededPayload<ILoginActionPayload>(
                        LOGIN_ACTION,
                        {
                            googleToken: accessToken,
                            user,
                        }
                    ));
                }

                firebaseDatabase
                    .ref("hunts")
                    .orderByChild("isCurrent")
                    .equalTo(true)
                    .limitToFirst(1)
                    .on("value", (huntSnapshots) => {
                        huntSnapshots.forEach((huntSnapshot) => {
                            const hunt = huntSnapshot.val() as IHunt;
                            dispatch(asyncActionSucceededPayload<ILoadHuntActionPayload>(
                                LOAD_HUNT_ACTION,
                                Object.assign({}, hunt, { year: Number(huntSnapshot.key) }),
                            ));
                            return true;
                        });
                    }, (error: Error) => {
                        dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
                    });
            });
    }
}

export const SAVE_HUNT_ACTION = "SAVE_HUNT_INFO";
export interface ISaveHuntActionPayload extends IHunt { }

export function saveHuntInfoAction(hunt: IHuntState) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION));
        let huntInfo = Object.assign({}, hunt);
        delete huntInfo["year"];
        firebaseDatabase
            .ref(`hunts/${hunt.year}`)
            .set(huntInfo)
            .then(() => {
                dispatch(asyncActionSucceededPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, huntInfo));
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, error));
            })
    };
}

export const SET_HUNT_DRIVE_FOLDER_ACTION = "SET_HUNT_DRIVE_FOLDER";

export function setHuntDriveFolderAction(folderId: string, huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION));
        firebaseDatabase
            .ref(`hunts/${huntKey}/driveFolderId`)
            .set(folderId)
            .then(() => {
                return loadFolder(dispatch, folderId);
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION, error));
            })
            .then(() => {
                dispatch(asyncActionSucceededPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION, folderId));
            });
    }
}
