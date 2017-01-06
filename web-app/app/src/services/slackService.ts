import { config } from "../config";
import { makeRequest } from "./fetch";

const { slack: slackConfig } = config;

export function getSlackAuthUrl() {
    const { slack: slackConfig } = config;
    const scope = "channels:write team:read";
    return `https://slack.com/oauth/authorize?client_id=${slackConfig.clientId}`
        + `&redirect_uri=${slackConfig.redirectURL}`
        + `&team=${slackConfig.team}`
        + `&scope=${scope}`;
}

const slackApi = "https://slack.com/api";

export interface ISlackAuthToken {
    access_token: string;
    scope: string;
}

function oauthAccess(code: string) {
    const oauthAccessUrl = `${slackApi}/oauth.access`
        + `?client_id=${slackConfig.clientId}`
        + `&client_secret=${slackConfig.clientSecret}`
        + `&code=${code}`
        + `&redirect_uri=${slackConfig.redirectURL}`;
    return makeRequest<ISlackAuthToken>(oauthAccessUrl, "GET")
        .then((token: ISlackAuthToken) => {
            return token.access_token;
        });
}

const oauth = {
    access: oauthAccess,
};

export interface ISlackChannel {
    creator: string;
    id: string;
    name: string;
    is_archived: boolean;
    is_member: boolean;
    members: string[];
}

export interface ISlackResponse {
    ok: boolean | string;
    error?: string;
}

export interface ISlackChannelResponse extends ISlackResponse {
    channel: ISlackChannel;
}

function createChannel(token: string, name: string): Promise<ISlackChannel> {
    return makeRequest<ISlackChannelResponse>(`${slackApi}/channels.create?token=${token}&name=${name}`, "GET").then((response) => {
        if (response.ok) {
            return response.channel;
        } else {
            throw new Error(response.error);
        }
    });
}

const channels = {
    create: createChannel,
};

export interface ISlackTeamInfo {
    id: string;
    name: string;
}

export interface ISlackTeamInfoResponse extends ISlackResponse {
    team: ISlackTeamInfo;
}

function getTeamInfo(token: string): Promise<ISlackTeamInfo> {
    return makeRequest<ISlackTeamInfoResponse>(`${slackApi}/team.info?token=${token}`, "GET").then((response) => {
        if (response.ok) {
            return response.team;
        } else {
            throw new Error(response.error);
        }
    });
}

const team = {
    info: getTeamInfo,
};

export const slack = {
    channels,
    oauth,
    team,
};