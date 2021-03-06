/* 
 * MIT License
 * 
 * Copyright (c) 2020 Nolonar
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

//=============================================================================
// Metadata
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Use a map as title screen.
 * @author Nolonar
 * @url https://github.com/Nolonar/RM_Plugins
 * 
 * @param mapId
 * @text Map ID
 * @desc The id of the map to render as title screen.
 * @type number
 * @min 1
 * @default 1
 * 
 * 
 * @help Version 1.0.3
 * 
 * This plugin does not provide plugin commands.
 * 
 * Notes:
 * If you wish to use a map the player can visit during the game, know that
 * this plugin does not load any save games, so all Switches will be off and
 * all Variables will be 0. You can change Switches and Variables, but they
 * will be reset when you return to the Title Screen.
 * 
 * This plugin is designed without the player character (or followers) in mind.
 * If you wish to display the player character, use an event instead.
 * 
 * Works with most event command, with a few limitations:
 * 
 *      - Message type commands require user input, which conflicts with the
 *        Title Command window (players can't start a New Game, for instance).
 *        This can be worked around for "Show Text..." by ending your text
 *        message with the \^ control character.
 * 
 *      - Avoid the "Play Movie..." command. Movies will hide the Title Command
 *        window, but players can still interact with it.
 * 
 *      - The following commands do nothing:
 *          - Transfer Player...
 *          - Set Movement Route... (with Player as target)
 *          - Get on/off Vehicle
 *          - Change Transparency...
 *          - Change Player Followers...
 *          - Gather Followers
 * 
 *      - Scene Control type commands like "Battle Processing..." work, but why
 *        would you even use them on the Title Screen? Remember that all
 *        Switches (including Self Switches) and Variables will be reset when
 *        you return to the Title Screen. You could get into an infinite loop.
 * 
 *      - System Settings type commands work, but most are useless. You can't
 *        have Encounters, so changing them is pointless.
 * 
 *      - "Change Map Name Display..." does nothing.
 * 
 *      - Battle type commands only work in battle, so they do nothing.
 * 
 * Plugin compatibility:
 * This plugin replaces Scene_Title, so compatibility with plugins that modify
 * Scene_Title is not guaranteed. For best compatibility, this plugin should
 * be placed high in the plugin list.
 */

(() => {
    const PLUGIN_NAME = "N_TitleMap";

    const parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.mapId = Number(parameters.mapId) || 1;

    //=========================================================================
    // Scene_TitleMap
    //=========================================================================
    const Scene_Title_old = Scene_Title;
    Scene_Title = class Scene_TitleMap extends Scene_Map {
        create() {
            Scene_Base.prototype.create.call(this);
            DataManager.loadMapData(parameters.mapId);
            this.createCommandWindow();
            // Scene_Map will create its own window layer later on.
            this.removeChild(this._windowLayer);

            // Needed to avoid player character from appearing on TitleMap when
            // player returns to Title.
            DataManager.setupNewGame();
        }

        createCommandWindow() {
            // Copy all commands from Scene_Title. This is compatible with
            // Plugins that add their own command to Scene_Title.
            const commands = Object.keys(Scene_Title_old.prototype)
                .filter(property => property.startsWith("command"));
            for (const command of commands) {
                Scene_TitleMap.prototype[command] = Scene_Title_old.prototype[command];
            }

            this.createWindowLayer();
            Scene_Title_old.prototype.createCommandWindow.call(this);
        }

        createAllWindows() {
            super.createAllWindows();
            this.addWindow(this._commandWindow);
            this._commandWindow.open();
        }

        drawGameTitle() {
            Scene_Title_old.prototype.drawGameTitle.call(this);
        }

        onMapLoaded() {
            $gameMap.setup(parameters.mapId);
            $dataMap.autoplayBgm = false; // Use Title Scene BGM instead.
            $gameMap.autoplay();
            $gamePlayer.center($gameMap.width() / 2, $gameMap.height() / 2);
            super.onMapLoaded();
            Scene_Title_old.prototype.createForeground.call(this);
        }

        start() {
            super.start();
            Scene_Title_old.prototype.playTitleMusic();
        }

        stop() {
            Scene_Base.prototype.stop.call(this);
        }

        needsFadeIn() {
            return true;
        }

        fadeOutAll() {
            const time = this.slowFadeSpeed() / 60;
            AudioManager.fadeOutBgm(time);
            AudioManager.fadeOutBgs(time);
            AudioManager.fadeOutMe(time);
            this.startFadeOut(1);
        }

        update() {
            $gameMap.update(true);
            $gameScreen.update();

            this.updateWaitCount();
            Scene_Base.prototype.update.call(this);
        }

        terminate() {
            super.terminate();
        }
    }

    function resetWeather() {
        $gameScreen.changeWeather("none", 0, 0);
    }

    function freezeCamera(action) {
        const previousMap = $gameMap;
        action();
        for (const property of ["_displayX", "_displayY", "_parallaxX", "_parallaxY"])
            $gameMap[property] = previousMap[property];
    }

    const Scene_Title_commandNewGame = Scene_Title_old.prototype.commandNewGame;
    Scene_Title_old.prototype.commandNewGame = function () {
        const previousMap = $gameMap;
        freezeCamera(Scene_Title_commandNewGame.bind(this));
        
    }; 


    const Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    Scene_Load.prototype.onLoadSuccess = function () {
        Scene_Load_onLoadSuccess.call(this);
        resetWeather();
    }
})();