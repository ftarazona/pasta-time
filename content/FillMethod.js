/** FilleMethod.js
 * 
 * Last modification on 11/11/2026 by F. TARAZONA
 *  Commenting
 * 
 * Base class FillMethod provides a common API for engines to apply
 * input value in HTML elements.
 * 
 * It also provides a registry mechanism for associating a name to 
 * child class of FillMethod.
 */


class FillMethod {
    static Register = {};

    /** register(name) -> () (static) 
     * 
     * Registers the calling class to the registry under the given name.
     * This method must be called by every child class in a static 
     * statement.
     */
    static register(name) {
        FillMethod.Register[name] = this;
    }

    /** new(methodName) -> FillMethod instance (static)
     * 
     * Returns a new instance of the child class registered under the
     * given name. If no class was registered, throws.
     */
    static new(methodName) {
        if(!Object.keys(FillMethod.Register).includes(methodName))
            throw new Error("FillMethod: no fill method", methodName);

        const Cls = FillMethod.Register[methodName];
        return new Cls();
    }

    /** apply(content, Element) -> () (async)
     * 
     * MUST BE OVERRIDEN
     * Applies the content in given element.
     */
    async apply(content, el) {
        throw new Error("Not implemented");
    }
}



/**
 * Two children classes are currently provided by default:
 *  SimpleInputMethod enters the value inside an INPUT element
 *  SimpleSelectMethod enters the value inside a SELECT element
 */
class SimpleInputMethod extends FillMethod {
    static { this.register("simpleinput"); }

    async apply(content, el) {
        console.log("SimpleInputMethod: applying", content, el);
        await Actions.input(el, content);
    }
}

class SimpleSelectMethod extends FillMethod {
    static { this.register("simpleselect"); }

    async apply(content, el) {
        console.log("SimpleSelectMethod: applying", content, el);
        await Actions.input(el, content);
    }
}