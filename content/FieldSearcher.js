/** FieldSearcher.js
 * 
 * Last modification on 11/11/2026 by F. TARAZONA
 *  Commenting
 * 
 * Class FieldSearcher allows systematic research of elements in a HTML
 * DOM with predefined paths.
 * 
 * The path files must be JSON formatted and contain an object in which
 * each property is named by the field name and a path.
 * Each path is a list of tuples (2-item lists). Each tuple gives an
 * HTMLElement query and the index of the element (-1 for last).
 */


class FieldSearcher {

    constructor() {
        this.paths = {};
    }

    /** setPaths(paths) -> ()
     * 
     * Adds paths to the currently setup paths. If a field name was 
     * already given a path, it is overwritten.
     */
    setPaths(paths) {
        Object.entries(paths).forEach(
            ([key, entry]) => this.paths[key] = entry
        );
    }

    /** search(fieldName) -> Element
     * 
     * Returns the element corresponding to the search name on the current
     * page.
     * 
     * Throws if no path was defined for the field name and if no element
     * can be found using the defined path.
     */
    search(fieldName) {
        const path = this.paths[fieldName];
        if(path == null)
            throw new Error("FieldSearcher: No path found for field name", fieldName);

        return path.reduce(
            (el, step) => {
                const [query, id] = step;

                const elements = el.querySelectorAll(query)
                if(id >= elements.length)
                    throw new Error("FieldSearcher: no element found for step", query, id);
                
                return [...elements].at(id);
            }, 
            document
        );
    }
}