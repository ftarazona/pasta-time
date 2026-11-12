/** ContentStore.js
 * 
 * Last modification on 11/11/2026 by F. TARAZONA
 *  Renaming for code lisibility
 * 
 * Base class ContentStore abstratcs loading of items, selection, 
 * removal, filtering.
 */


class ContentStore {

    /** An engine must be given to the content store so that the store
     * can automatically trigger an update of sidebar info if needed. */
    constructor(engine) {
        this.engine = engine;
        this._items = [];
        this.objectType = null;
        this.selectedId = null;
    }



    /*********************/
    /** LOADING METHODS **/
    /*********************/

    /** Loads the content of a file, separating items if the file
     * indicates multiple items are in it.
     * 
     * If a filter was set, only items passing the filter are loaded. */
    loadContent(content) {
        const type = content.objectType || "item";
        if(type === "list") {
            if(!("items" in content)) return;
            content.items.forEach(
                it => this.loadContent(it)
            );
        } else if(
            this.objectType == null ||
            this.objectType === type
        ) {
            this._items.push(content);
        }
    }

    /** Loads a list of files. If a file is not valid as a JSON file, the
     * user is notified and the file is skipped.
     * 
     * The engine is notified after loading. */
    async loadFiles(files) {
        for(const file of files) {
            const rawContent = await file.text();
            try {
                const content = JSON.parse(rawContent);
                this.loadContent(content);
            } catch(e) { 
                alert("JSON parsing error:", e)
            }
        }

        this.engine.notifyInfoUpdated();
    }



    /********************/
    /** ACCESS METHODS **/
    /********************/

    /** Returns the list of items currently loaded.
     * If a filter was set, the list contains only items passing the
     * filter. */
    get items() {
        return this.objectType != null
            ? this._items.filter(
                it => it.objectType === this.objectType
            )
            : this._items;
    }

    /** Returns the currently selected item, null if no selection was
     * made. */
    get selected() {
        return this.selectedId != null
            ? this._items[this.selectedId]
            : null;
    }

    /** Returns the name of item displayed by the sidebar.
     * THIS METHOD MUST BE OVERRIDEN BY CHILDREN CLASSES. */
    getName(item)       { throw new Error("Not implemented"); }

    /** Returns the summary of item displayed by the sidebar if the
     * item is selected.
     * THIS METHOD MUST BE OVERRIDEN BY CHILDREN CLASSES. */
    getSummary(item)    { throw new Error("Not implemented"); }

    /** Returns the info displayed by the sidebar:
     *  - items is a list of objects. Each object contains the id in the
     * unfiltered list of items, the name and summary of the item. the
     * list contains only items passing the filter.
     *  - selectedId is the ID of the currently selected item, null if
     * no item is selected. */
    get info() {
        return {
            items: this._items
                .map((f, idx) => ({
                    id: idx,
                    name: this.getName(f),
                    summary: this.getSummary(f)
                }))
                .filter(({id}) =>
                    this.objectType == null ||
                    this._items[id].objectType === this.objectType
                ),
            selectedId: this.selectedId
        };
    }



    /********************/
    /** ACTION METHODS **/
    /********************/

    /** Sets the selected Id to the given value and notifies the engine
     * of the update. */
    select(id) {
        this.selectedId = id;
        this.engine.updateItem(this.selected);
    }

    /** Removes the given ID, setting selected ID to null if the item was
     * selected. */
    remove(id) {
        this._items.splice(id, 1);

        if(this.selectedId === id)
            this.select(null);

        this.engine.notifyInfoUpdated();
    }

    /** Toggles the given ID (setting selected to null if it was selected,
     * selecting it otherwise). */
    toggle(id) {
        if(this.selectedId === id)
            this.select(null);
        else
            this.select(id);

        this.engine.notifyInfoUpdated();
    }

    /** Applies a filtering object type to the store and resets the 
     * current selection. */
    filter(objectType) {
        this.objectType = objectType;
        this.select(null);
    }
}