
import { Intent } from "matrix-bot-sdk";
import { BridgeWidgetConfig } from "../Config/Config";
import { CommandError } from "../errors";
import LogWrapper from "../LogWrapper";
import { HookshotWidgetKind } from "./WidgetKind";
const log = new LogWrapper("SetupWidget");

export class SetupWidget {

    static async SetupAdminRoomConfigWidget(roomId: string, botIntent: Intent, config: BridgeWidgetConfig): Promise<boolean> {
        if (await SetupWidget.createWidgetInRoom(roomId, botIntent, config, HookshotWidgetKind.Settings, "bridge_control")) {
            await botIntent.sendText(roomId, `If your client supports it, you can open the "${config.branding.widgetTitle}" widget to configure hookshot.`);
            return true;
        }
        return false;
    }

    static async SetupRoomConfigWidget(roomId: string, botIntent: Intent, config: BridgeWidgetConfig): Promise<boolean> {
        if (await SetupWidget.createWidgetInRoom(roomId, botIntent, config, HookshotWidgetKind.RoomConfiguration, "hookshot_room_config")) {
            await botIntent.sendText(roomId, `Please open the ${config.branding.widgetTitle} widget to setup integrations.`);
            return true;
        }
        return false;
    }

    private static async createWidgetInRoom(roomId: string, botIntent: Intent, config: BridgeWidgetConfig, kind: HookshotWidgetKind, stateKey: string): Promise<boolean> {
        log.info(`Running SetupRoomConfigWidget for ${roomId}`);
        if (!await botIntent.underlyingClient.userHasPowerLevelFor(botIntent.userId, roomId, "im.vector.modular.widgets", true)) {
            throw new CommandError("Bot lacks power level to set room state", "I do not have permission to create a widget in this room. Please promote me to an Admin/Moderator.");
        }
        try {
            const res = await botIntent.underlyingClient.getRoomStateEvent(
                roomId,
                "im.vector.modular.widgets",
                stateKey
            );
            // Deleted widgets are empty objects
            if (res && Object.keys(res).length > 0) {
                log.debug(`Widget for ${roomId} exists, not creating`);
                // No-op
                // Validate?
                return false;
            }
        } catch (ex) {
            // Didn't exist, create it.
        }
        log.debug(`Generating widget state event for ${roomId}`);
        await botIntent.underlyingClient.sendStateEvent(
            roomId,
            "im.vector.modular.widgets",
            stateKey,
            {
                "creatorUserId": botIntent.userId,
                "data": {
                    "title": config.branding.widgetTitle
                },
                "id": stateKey,
                "name": config.branding.widgetTitle,
                "type": "m.custom",
                "url": new URL(`#/?kind=${kind}&roomId=$matrix_room_id&widgetId=$matrix_widget_id`, config.parsedPublicUrl).href,
                "waitForIframeLoad": true,
            }
        );
        return true;
    }
}