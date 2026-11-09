class Cursor {

    constructor(plan, content=null) {
        this.cursor = [];
        this.plan = null;
        this.content = [];
        this.hasHit = null;
    }


    static isSingleLevel(planIt) {
        return !Object.keys(planIt).includes("list")
    }

    reset() {
        this.cursor = [];
    }

    static init_rec(planIt, contentIt) {
        if(Cursor.isSingleLevel(planIt[0])) {
            return [[0, null]];
        } else {
            const rec = Cursor.init_rec(
                planIt[0].list, contentIt[planIt[0].name]
            );
            return [[0, 0], ...rec];
        }
    }

    static last_rec(planIt, contentIt) {
        if(Cursor.isSingleLevel(planIt.at(-1))) {
            return [[planIt.length - 1, null]];
        } else {
            const rec = Cursor.last_rec(
                planIt.at(-1).list, contentIt[planIt.at(-1).name]
            );
            return [[planIt.length - 1, contentIt[planIt.at(-1).name].length - 1], ...rec]
        }
    }

    static increment_rec(cursor, planIt, contentIt) {
        if(cursor.length === 0) {   //The cursor is not initialized

            return Cursor.init_rec(planIt, contentIt);

        } else if(cursor.length === 1) {    //The cursor points to an end level

            const planIdx = cursor[0][0];
            if(planIdx + 1 < planIt.length) {   //There is a next field to go through
                const nextPlanIt = planIt[planIdx + 1];
                if(!Cursor.isSingleLevel(nextPlanIt)) {  //The next field is a list
                    const rec = Cursor.init_rec(nextPlanIt.list, contentIt);
                    return [[planIdx + 1, 0], ...rec]
                } else {
                    return [[planIdx + 1, null]];
                }
            } else {    //There are no more fields to go through
                return [];
            }

        } else {    //There are other sublevels that could be incremented

            const [planIdx, contentIdx] = cursor.shift();
            const nextPlanIt = planIt[planIdx].list;
            const nextContentList = contentIt[planIt[planIdx].name];
            const nextContentIt = nextContentList[contentIdx];

            const rec = Cursor.increment_rec(
                cursor, nextPlanIt, nextContentIt
            );

            if(rec.length > 0) {    //The sublevels got incremented
                return [[planIdx, contentIdx], ...rec];
            } else {
                if(contentIdx + 1 < nextContentList.length) {   //There is a next content item to be checked in this level
                    const newContentIt = nextContentList[contentIdx + 1];
                    const subCursor = Cursor.init_rec(
                        nextPlanIt, newContentIt
                    );
                    return [[planIdx, contentIdx + 1], ...subCursor];
                } else {
                    if(planIdx + 1 < planIt.length) {
                        return Cursor.increment_rec(
                            [[planIdx + 1, null]], 
                            planIt[planIdx+1], 
                            contentIt[planIt[planIdx+1].name]
                        );
                    } else {
                        return []
                    }
                }
            }
        }
    }

    static decrement_rec(cursor, planIt, contentIt) {
        if(cursor.length === 0) {   //The cursor is not initialized

            return Cursor.last_rec(planIt, contentIt);

        } else if(cursor.length === 1) {    //The cursor points to an end level

            const planIdx = cursor[0][0];
            if(planIdx - 1 >= 0) {   //There is a next field to go through
                const prevPlanIt = planIt[planIdx - 1];
                if(!Cursor.isSingleLevel(prevPlanIt)) {  //The next field is a list
                    const rec = Cursor.last_rec(prevPlanIt.list, contentIt);
                    return [[planIdx - 1, contentIt[planIt[planIdx - 1].name].length - 1], ...rec]
                } else {
                    return [[planIdx - 1, null]];
                }
            } else {    //There are no more fields to go through
                return [];
            }

        } else {    //There are other sublevels that could be incremented

            const [planIdx, contentIdx] = cursor.shift();
            const prevPlanIt = planIt[planIdx].list;
            const prevContentList = contentIt[planIt[planIdx].name];
            const prevContentIt = prevContentList[contentIdx];

            const rec = Cursor.decrement_rec(
                cursor, prevPlanIt, prevContentIt
            );

            if(rec.length > 0) {    //The sublevels got incremented
                return [[planIdx, contentIdx], ...rec];
            } else {
                if(contentIdx - 1 >= 0) {   //There is a next content item to be checked in this level
                    const newContentIt = prevContentList[contentIdx - 1];
                    const subCursor = Cursor.last_rec(
                        prevPlanIt, newContentIt
                    );
                    return [[planIdx, contentIdx - 1], ...subCursor];
                } else {
                    if(planIdx - 1 >= 0) {
                        const newPlanIt = planIt[planIdx - 1];
                        if(Cursor.isSingleLevel(newPlanIt)) {
                            return [[planIdx - 1, null]];
                        } else {
                            const subCursor = Cursor.last_rec(
                                newPlanIt.list, contentIt[newPlanIt.name]
                            );
                            return [
                                [
                                    planIdx - 1, 
                                    contentIt[newPlanIt.name].length - 1
                                ], ...subCursor
                            ]; 
                        }
                    } else {
                        return []
                    }
                }
            }
        }
    }

    init() {
        if(this.plan == null) this.cursor = [];
        this.cursor = Cursor.init_rec(this.plan, this.content)
        this.hasHit = "start";
    }

    nextFrom(cursor) {
        return Cursor.increment_rec(
            [...cursor], this.plan, this.content
        );
    }

    prevFrom(cursor) {
        return Cursor.decrement_rec(
            [...cursor], this.plan, this.content
        );
    }

    increment() {
        if(this.hasHit === "end") return null;

        this.cursor = this.nextFrom(this.cursor);
        if(this.nextFrom(this.cursor).length === 0) {
            this.hasHit = "end"
        } else {
            this.hasHit = "none";
        }
    }

    decrement() {
        if(this.hasHit === "start") return null;

        this.cursor = this.prevFrom(this.cursor);
        if(this.prevFrom(this.cursor).length === 0) {
            this.hasHit = "start";
        } else {
            this.hasHit = "none";
        }
    }

    static at_rec(cursor, planIt, contentIt) {
        const [planId, contentId] = cursor.shift();
        const fName = planIt[planId].name;

        if(cursor.length === 0) {
            return [planIt[planId], contentIt[fName]];
        } else {
            return Cursor.at_rec(
                cursor, planIt[planId].list, contentIt[fName][contentId]
            )
        }
    }

    at(cursor) {
        if(cursor.length === 0) return;
        return Cursor.at_rec(
            [...cursor], this.plan, this.content
        );
    }

    getPrevNext(n=2) {
        const response = Array(n*2 + 1);
        const current = [...this.cursor];

        response[n] = this.at(current);
        let prev = current;
        let next = current;
        let prevAllowed = true;
        let nextAllowed = true;

        for(var i = 0; i < n; i++) {
            prev = this.prevFrom(prev);
            next = this.nextFrom(next);
            prevAllowed = prevAllowed ? prev.length > 0 : false;
            nextAllowed = nextAllowed ? next.length > 0 : false;

            response[n-(i+1)] = prevAllowed ? this.at(prev): null;
            response[n+(i+1)] = nextAllowed ? this.at(next): null;
        }

        return response;
    }

    get current() {
        return this.at(this.cursor);
    }

    get isReady() {
        return this.plan != null && this.content != null;
    }

    setPlan(plan) {
        this.plan = plan;
        if(this.isReady)
            this.init();
    }

    setContent(content) {
        this.content = content;
        if(this.isReady)
            this.init();
    }
}