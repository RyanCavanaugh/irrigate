import irr = require('../lib/irrigate');
import chai = require('chai');
let assert = chai.assert;

function cycle<T>(irr: irr, x: T): T {
	let s = irr.serialize(x);
	return <T>irr.deserialize(s);
}

describe('Basic JSON', () => {
	let ir = new irr();
	let testObjects: any[] = [];
	testObjects.push('hello world');
	testObjects.push(42);
	testObjects.push(false);
	testObjects.forEach(obj => {
		it('Has the same behavior as JSON for primitive ' + JSON.stringify(obj), () => {
			assert.equal(ir.serialize(obj), JSON.stringify(obj));
		});
	});
});

describe('Trivial Objects', () => {
	let ir = new irr();
	let testObjects: any[] = [];
	testObjects.push({m: 4});
	testObjects.push({m: {x: '}'}});

	testObjects.forEach(obj => {
		it('Recycles trivial object ' + JSON.stringify(obj) + ' correctly', () => {
			let expected = JSON.stringify(obj);
			let actualSerialized = ir.serialize(obj);
			let actualDeserialized = ir.deserialize(actualSerialized);

			assert.equal(JSON.stringify(actualDeserialized), expected);
		});
	});
});

describe('Circular Objects', () => {
	let ir = new irr();

	it('Handles forward cycles correctly', () => {
		let testObj1 = { x: <any>null };
		let testObj2 = { y: testObj1 };
		testObj1.x = testObj2;

		let result = cycle(ir, testObj1);
		assert.equal(result, result.x.y);
	});

	it('Handles reverse cycles correctly', () => {
		let testObj1 = { x: <any>null };
		let testObj2 = { y: testObj1 };
		testObj1.x = testObj2;

		let result = cycle(ir, testObj2);
		assert.equal(result, result.y.x);
	});

	it('Handles self-reference correctly', () => {
		let obj = { x: <any>null };
		obj.x = obj;

		let result = cycle(ir, obj);
		assert.equal(result, result.x);
	});
});

