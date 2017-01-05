import * as React from "react";
import { IRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import { IGoogleDriveFile } from "gapi";

import {
    IAsyncLoaded,
    isAsyncLoaded,
    loadHuntAndUserInfoAction,
    logoutAction,
    saveHuntInfoAction,
} from "./actions";
import { firebaseAuth } from "./auth";
import { DiscoveredPages } from "./puzzles";
import { IAppState, IHuntState } from "./state";

interface IAdminDashboardState {
    hasChanges?: boolean;
    hunt?: IHuntState;
    huntDriveFolder?: IGoogleDriveFile;
    isCurrentDriveFolderRoot?: boolean;
    isFolderDialogShown?: boolean;
    isLoading?: boolean;
    loggedIn?: boolean;
}

interface IRouterContext {
    router: IRouter;
}

interface IOwnProps {}

interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
    logout: () => void;
    saveHuntInfo: (hunt: IHuntState) => void;
}

interface IStateProps {
    childFolders: IAsyncLoaded<IGoogleDriveFile[]>;
    hunt: IAsyncLoaded<IHuntState>;
    huntDriveFolder: IAsyncLoaded<IGoogleDriveFile>;
}

interface IAdminDashboardProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedAdminDashboard extends React.Component<IAdminDashboardProps, IAdminDashboardState> {
    public state: IAdminDashboardState = {
        isLoading: true,
        loggedIn: false,
    };

    public context: IRouterContext;
    static contextTypes = {
        router: React.PropTypes.object.isRequired,
    };

    public componentDidMount() {
        const { loadHuntAndUserInfo } = this.props;
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            if (user == null) {
                this.context.router.push("/login");
            } else {
                this.setState({
                    loggedIn: true,
                });
                loadHuntAndUserInfo();
            }
        });
    }

    public componentDidUpdate(oldProps: IAdminDashboardProps) {
        const { hunt, huntDriveFolder } = this.props;

        if (!isAsyncLoaded(oldProps.hunt) && isAsyncLoaded(hunt)) {
            const hunt = this.props.hunt.value;
            this.setState({
                hunt,
                isLoading: false,
                isCurrentDriveFolderRoot: hunt.driveFolderId === undefined,
            });
        }

        if (!isAsyncLoaded(oldProps.huntDriveFolder) && isAsyncLoaded(huntDriveFolder)) {
            this.setState({
                huntDriveFolder: huntDriveFolder.value,
            });
        }
    }

    public render() {
        if (this.state.isLoading) {
            return <span>Loading...</span>;
        } else {
            if (this.state.loggedIn) {
                return this.renderDashboard();
            } else {
                // shouldn't get here
                return <span>Please login</span>;
            }
        }
    }

    private handleHuntDomainChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.domain) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { domain: newValue }),
            });
        }
    }

    private handleHuntNameChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.name) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { name: newValue }),
            });
        }
    }

    private handleHuntTitleRegexChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.titleRegex) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { titleRegex: newValue }),
            });
        }
    }

    private handleHuntDriveFolderChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        const folderIdRegex = new RegExp(/https:\/\/drive.google.com\/drive\/u\/0\/folders\/(.+)$/g);
        const matches = folderIdRegex.exec(newValue);
        if (matches.length > 1 && matches[1] !== this.props.hunt.value.driveFolderId) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { driveFolderId: matches[1] }),
            });
        } 
    }

    private handleSave = () => {
        this.props.saveHuntInfo(this.state.hunt);
        this.setState({ hasChanges: false });
    }

    private handleLogout = () => {
        const { logout } = this.props;
        logout();
    }

    private renderDashboard() {
        const hunt = this.props.hunt.value;
        return (
            <div className="dashboard">
                <div className="header">
                    <h1>STAPH [ADMIN]</h1>
                    <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                </div>
                <button onClick={this.handleLogout}>Logout</button>
                <div className="hunt-edit-container">
                    <div className="hunt-information">
                        <div className="edit-info-line">
                            <label>Hunt Name</label>
                            <input type="text" defaultValue={hunt.name} onChange={this.handleHuntNameChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>url to match</label>
                            <input type="text" defaultValue={hunt.domain} onChange={this.handleHuntDomainChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>match title</label>
                            <input type="text" defaultValue={hunt.titleRegex} onChange={this.handleHuntTitleRegexChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>google drive folder</label>
                            <input type="text" defaultValue={this.getHuntFolderLink()} onChange={this.handleHuntDriveFolderChange} />
                        </div>
                    </div>
                    <button disabled={!this.state.hasChanges} onClick={this.handleSave}>{ this.state.hasChanges ? "Save" : "Saved" }</button>
                </div>
                <DiscoveredPages huntKey={hunt.year} titleRegex={hunt.titleRegex} />
            </div>
        )
    }

    private getHuntFolderLink() {
        const { hunt } = this.state;
        if (hunt.driveFolderId === undefined) {
            return undefined;
        } else {
            return `https://drive.google.com/drive/u/0/folders/${hunt.driveFolderId}`;
        }
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    const { childFolders, huntDriveFolder, hunt } = state;
    return {
        childFolders,
        hunt,
        huntDriveFolder,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadHuntAndUserInfo: loadHuntAndUserInfoAction,
        logout: logoutAction,
        saveHuntInfo: saveHuntInfoAction,
    }, dispatch);
}

export const AdminDashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedAdminDashboard);
