/** Cursor.js
 * 
 * Last modification on 11/11/2026 by F. TARAZONA
 *  Renaming for lisibility of code
 * 
 * Class Cursor implements the lexicographical order of a plan applied to
 * a given item.
 * 
 * The current implementation does not support empty list in items.
 * Providing items with empty lists would result in undefined behavior.
 */


function inBounds(i, bounds) {
    return i >= bounds[0] && i <= bounds[1];
}

class Cursor {

    /** An engine must be given to the cursor so that the store
     * can automatically trigger an update of sidebar info if needed. */
    constructor(engine) {
        this.engine = engine;

        this.cursor = [];
        this.hasHit = null;

        this.plan = null;
        this.item = null;
    }


    /** Indicates whether the given field has subfields. */
    static _isPlan(field) {
        return Object.keys(field).includes("list")
    }


    
    /*****************************************/
    /** RECURSIVE COMPUTING OF CURSOR STEPS **/
    /*****************************************/

    /** Given a plan and an item, returns the first cursor possible. */
    static _begin_rec(plan, item) {
        if(!Cursor._isPlan(plan[0])) {
            return [[0, null]];
        } else {
            const rec = Cursor._begin_rec(
                plan[0].list, item[plan[0].name]
            );
            return [[0, 0], ...rec];
        }
    }

    /** Given a plan and an item, returns the last cursor possible. */
    static _end_rec(plan, item) {
        if(Cursor._isPlan(plan.at(-1))) {

            const lastField = plan.at(-1);
            const lastFieldName = lastField.name;

            const rec = Cursor._end_rec(
                lastField.list, item[lastFieldName]
            );
            return [[plan.length - 1, item[lastFieldName].length - 1], ...rec]
        
        } else {

            return [[plan.length - 1, null]];

        }
    }

    /** Given a cursor, plan and item, returns the field and value pointed
     * by the cursor. */
    static _at_rec(cursor, plan, item) {
        const [iField, iItem] = cursor.shift();
        const fieldName = plan[iField].name;

        return cursor.length > 0
            ? Cursor._at_rec(cursor, plan[iField].list, item[fieldName][iItem])
            : [plan[iField], item[fieldName]];
    }

    /** Returns the first cursor step, depending on the given direction. */
    static _step_noCursor(plan, item, dir) {
        return dir === "incr"
            ? Cursor._begin_rec(plan, item)
            : Cursor._end_rec(plan, item);
    }

    /** Returns the next cursor for a single level cursor depending on 
     * the given direction. */
    static _step_singleLevelCursor(plan, iField, item, dir) {

        //We are looking for the next field in the plan. This next field
        //depends on the direction of the step
        const iNextField = iField + (dir === "incr" ? +1 : -1);
        const nextFieldBounds = [0, plan.length - 1];
        
        if(inBounds(iNextField, nextFieldBounds)) {

            //There is a next field to be explored in the plan.
            //In this case, this field may or may not have subfields.
            const nextField = plan[iNextField];

            if(Cursor._isPlan(nextField)) {

                //If next field is actually another plan, we now have the
                //first field in the new cursor, and the subcursor that
                //comes after this is the first or last of the subplan
                //applied to the subitem.
                const nextPlan = nextField.list;
                const iNextSubItem = dir === "incr"
                    ? 0
                    : item[nextPlan.name].length - 1;
                
                const rec = Cursor._step_noCursor(nextPlan, item, dir);
                return [[iNextField, iNextSubItem], ...rec];
            
            } else {

                return [[iNextField, null]];

            }

        } else {

            return [];

        }
    }

    /** Returns the next cursor for a cursor that still has sub levels to
     * explore. */
    static _step_multipleLevelCursor(cursor, plan, item, dir) {
        
        //There is a subcursor that may be incremented. We first try to
        //step with this subcursor.
        const [iField, iItem]   = cursor.shift();
        const subPlan           = plan[iField].list;
        const subItemList       = item[plan[iField].name];
        const subItem           = subItemList[iItem];

        const rec = Cursor._step_rec(cursor, subPlan, subItem, dir);

        if(rec.length > 0) {

            //The subcursor has been stepped successfully. The first
            //cursor is kept and the stepped subcursor is appended.
            return [[iField, iItem], ...rec];

        } else {

            //Otherwise, we try to step to a new subitem
            const iNextSubItem = iItem + (dir === "incr" ? +1 : -1);
            const nextSubItemBounds = [0, subItemList.length - 1];

            if(inBounds(iNextSubItem, nextSubItemBounds)) {

                //If there is a new sub item to explore, we initialize
                //the subcursor on this new subitem.
                const nextSubItem = subItemList[iNextSubItem];
                const subCursor = Cursor._step_noCursor(
                    subPlan, nextSubItem, dir
                );

                return [[iField, iNextSubItem], ...subCursor];

            } else {

                //If there is no new subitem to explore, we try to explore
                //a new field in the plan.
                const iNextField = iField + (dir === "incr" ? +1 : -1);
                const nextFieldBounds = [0, plan.length - 1];

                if(inBounds(iNextField, nextFieldBounds)) {

                    const nextField = plan[iNextField];

                    if(Cursor._isPlan(nextField)) {

                        //If the next field has subfields, we initialize
                        //the subcursor
                        const subCursor = Cursor._step_noCursor(
                            nextField.list, item[nextField.name], dir
                        );

                        return [
                            [
                                iNextField, 
                                item[nextField.name]
                                    .at(dir === "incr" ? 0 : -1)
                            ],
                            ...subCursor
                        ];

                    } else {

                        return [[iNextField, null]];

                    }

                } else {

                    //We had reached the last field in the plan
                    return [];

                }

            }

        }
    }

    /** Returns the next cursor, incremented if dir is "incr", decremented
     * if dir is "decr".
     * 
     * The caller is responsible for consistency of plan and item. If the
     * plan is null or the item contains empty list, the behavior is
     * undefined. */
    static _step_rec(cursor, plan, item, dir) {

        if(cursor.length === 0) {

            return Cursor._step_noCursor(plan, item, dir);

        } else if(cursor.length === 1) {

            return Cursor._step_singleLevelCursor(
                plan, cursor[0][0], item, dir
            );

        } else {

            return Cursor._step_multipleLevelCursor(
                cursor, plan, item, dir
            );

        }
    }


    
    /*****************************/
    /** HELPER INSTANCE METHODS **/
    /*****************************/

    /** Wrapper for static _at_rec, given any cursor valid for the 
     * current item.
     * 
     * If the cursor is empty, null is returned. */
    _at(cursor) {
        return cursor.length > 0
            ? Cursor._at_rec([...cursor], this.plan, this.item)
            : null;
    }

    /** Wrapper for static _step_rec, with dir = "incr", returns the
     * incremented cursor given the current item. */
    _nextFrom(cursor) {
        return Cursor._step_rec(
            [...cursor], this.plan, this.item, "incr"
        );
    }

    /** Wrapper for static _step_rec, with dir = "decr", returns the
     * decremented cursor given the current item. */
    _prevFrom(cursor) {
        return Cursor._step_rec(
            [...cursor], this.plan, this.item, "decr"
        );
    }


    
    /****************************************/
    /** INSTANCE METHODS EXPOSED TO ENGINE **/
    /****************************************/

    /** Indicates whether the cursor is initialized and ready to point
     * the cursor. */
    get isReady() {
        return this.plan != null && this.item != null;
    }

    /** Sets the cursor to its begin position and notifies the engine
     * of the update if asked (asked by default) */
    begin(notify=true) {
        if(!this.isReady) {
            this.cursor = [];
        } else {
            this.cursor = Cursor._begin_rec(this.plan, this.item)
            this.hasHit = "start";
        }

        if(notify)
            this.engine.notifyInfoUpdated();
    }

    /** Sets the cursor to its end position and notifies the engine
     * of the update if asked (asked by default) */
    end(notify=true) {
        if(!this.isReady) {
            this.cursor = [];
        } else {
            this.cursor = Cursor._end_rec(this.plan, this.item)
            this.hasHit = "end";
        }

        if(notify)
            this.engine.notifyInfoUpdated();
    }

    /** Setup plan and sets the cursor to its begin position, notifying
     * the engine of the update.
     * 
     * If the plan is invalid, further behavior is undefined. */
    setPlan(plan) {
        this.plan = plan;
        this.begin();
    }

    /** Setup item and sets the cursor to its begin position, notifying
     * the engine of the update.
     * 
     * If the item is invalid, further behavior is undefined. */
    setItem(item) {
        this.item = item;
        this.begin();
    }

    /** Increments the position of cursor if possible and notifies the
     * engine of the update if asked. */
    increment(notify=true) {
        if(this.hasHit === "end") return null;

        const cursor = this._nextFrom(this.cursor);
        this.cursor = cursor;

        if(this._nextFrom(cursor).length === 0) {
            this.hasHit = "end"
        } else {
            this.hasHit = "none";
        }

        if(notify)
            this.engine.notifyInfoUpdated();
    }

    /** Decrements the position of cursor if possible and notifies the
     * engine of the update if asked. */
    decrement(notify=true) {
        if(this.hasHit === "start") return null;

        const cursor = this._prevFrom(this.cursor);
        this.cursor = cursor;

        if(this._prevFrom(cursor).length === 0) {
            this.hasHit = "start";
        } else {
            this.hasHit = "none";
        }

        if(notify)
            this.engine.notifyInfoUpdated();
    }

    /** Wrapper for static method _at. */
    get current() {
        return this._at(this.cursor);
    }

    /** Returns an array of field name and corresponding item value 
     * around the current cursor.
     * 
     * It the window goes beyond the start or end of the item, concerned
     * array positions are set to [null, null]. */
    getWindow(n=2) {
        const response = Array(n*2 + 1);
        if(!this.isReady) {
            response.fill([null, null], 0);
            return response;
        }

        const current = [...this.cursor];
        response[n] = this._at(current);

        let prev = current;
        let next = current;
        let prevAllowed = true;
        let nextAllowed = true;

        for(var i = 0; i < n; i++) {
            prev = this._prevFrom(prev);
            next = this._nextFrom(next);
            prevAllowed = prevAllowed ? prev.length > 0 : false;
            nextAllowed = nextAllowed ? next.length > 0 : false;

            response[n-(i+1)] = prevAllowed ? this._at(prev): null;
            response[n+(i+1)] = nextAllowed ? this._at(next): null;
        }

        return response
            .map(step => step != null 
                ? [step[0].name, step[1]]
                : [null, null]
            );
    }
}