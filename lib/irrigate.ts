interface Indexable<T> {
	[s: string]: T
}

const magicKey = '_irr_';
let lastKnownKey = 1;
class Irrigate {
    private containers: {
        [name: string]: any;
    } = {};

    private registeredClasses: {
        [name: string]: any;
    } = {};

    constructor() {

    }

    addContainer(name: string, container: {}): void;
    addContainer(name: string, container: Indexable<any>) {
        if (this.containers.hasOwnProperty(name)) throw new Error('Already registered a container named ' + name);

        this.containers[name] = container;
        Object.keys(container).forEach(k => {
            var obj = container[k];
            if (obj.prototype) {
                this.registeredClasses[name + '.' + k] = obj.prototype;
            }
        });
    }

    getTypeName(obj: {}) {
        var name: string = undefined;
        var proto = Object.getPrototypeOf(obj);
        Object.keys(this.registeredClasses).forEach(k => {
            if (this.registeredClasses[k] === proto) {
                name = k;
                return false;
            }
        });
        return name;
    }

    hydrateInstance(name: string): {} {
        var result: {} = undefined;

        Object.keys(this.registeredClasses).forEach(k => {
            if (k === name) {
                result = Object.create(this.registeredClasses[k]);
                return false;
            }
        });

        return result;
    }

    deserialize(data: string): {} {
        // Perform a naive deserialization of the object. This will
        // have some irrigation pointers in it which we will first
        // index, then patch up
		let result = JSON.parse(data);

        // This maps from irrigation pointer strings to actual objects
		let catalog: Indexable<{}> = {};

        index(result);
        let fixedUp = fixup(result);
        cleanup(fixedUp);
        return fixedUp;

        // Walks the deserialized object tree and pushes complex objects
        // into the catalog
		function index(obj: any) {
			if(typeof obj === 'object') {
                catalog[obj[magicKey]] = obj;

                Object.keys(obj).forEach(k => index(obj[k]));
			}
		}

        // Changes all references to pointered objects to their actual referrents
		function fixup(obj: any) {
			if(typeof obj === 'object') {
				let keys = Object.keys(obj);
				keys.forEach(k => {
					obj[k] = fixup(obj[k]);
				});
				return obj;
			} else if(typeof obj === 'string') {
				if(obj.indexOf(magicKey) === 0) {
					let num = obj.substr(magicKey.length);
                    if (!catalog.hasOwnProperty(num)) throw new Error('Missing key in catalog ' + num);
                    return catalog[num];
				} else {
                    return obj;
                }
			} else {
                return obj;
            }
		}

        // Removes any irrigation index values
        function cleanup(obj: any) {
            if(typeof obj === 'object') {
                if (obj.hasOwnProperty(magicKey)) {
                    delete obj[magicKey];
                    Object.keys(obj).forEach(k => cleanup(obj[k]));
                }
            }
        }
    }



    serialize(x: {}): string;
    serialize(x: Indexable<{}>) {
        if (typeof x === 'object') {
        	if(x.hasOwnProperty(magicKey)) {
				return '"' + magicKey + x[magicKey] + '"';
        	}

			x[magicKey] = lastKnownKey++;

            var proto = Object.getPrototypeOf(x);
            if(proto === Object.prototype) {
            	// Non-class object
				let keys = Object.keys(x);
				return '{' + keys.map(k => JSON.stringify(k) + ':' + this.serialize(x[k])).join(",") + '}';
            }
            var name = '';
            Object.keys(this.registeredClasses).forEach(k => {
                if (this.registeredClasses[k] === proto) {
                    name = k;
                }
            });
            return '{ __proto__: ' + name + '}';
        } else if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean' || typeof x === 'undefined') {
			return JSON.stringify(x);
		} else if(x === null) {
			return 'null';
        } else {
			throw new Error('wat');
        }
    }
}

export = Irrigate;
