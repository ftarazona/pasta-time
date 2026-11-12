/** Messaging.js
 * 
 * Last modification on 10/11/2026 by F. TARAZONA
 *  File creation
 * 
 * Class Messaging defines message types exchanged by the engines (content
 * scripts), the background script and the sidebar manager.
 */

class Messaging {

    static BACKGROUND_READY_FOR_ENGINE = 1;
    static IS_READY_FOR_ENGINE = 2;

    //Messages sent from the engine to the background

    static ENGINE_REGISTRATION_REQUEST = 11;
        // (mapping) -> ()
    static REGISTRATION_SUCCESS = 12;
    static REGISTRATION_FAILURE = 13;


    //Messages sent from the engine to the sidebar

    static ENGINE_INFO_UPDATED = 21;
        // (info) -> ()
    static SIDEBAR_RESET_INFO = 22;
    static SIDEBAR_NO_ENGINE_AVAILABLE = 23;
    

    //Messages sent from the sidebar to the engines
    //These messages may trigger an ENGINE_CONTENT_UPDATED message so that the
    // sidebar gets updated information

    static REQUEST_INFO_UPDATE  = 31;
        // () -> ()
    static ITEM_REMOVED         = 32;
        // (fileId) -> ()
    static ITEM_TOGGLED         = 33;
        // (fileId) -> ()
    static FILES_UPLOADED       = 34;
        // (files) -> ()


    //Messages sent from the background to the engines

    static EXECUTE_COMMAND          = 42;
        // (command) -> ()
}