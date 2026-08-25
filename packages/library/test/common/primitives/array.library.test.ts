import { byKey, sortKey } from '#library/array.library.js';

describe('Array Library', () => {
	describe('byKey', () => {
		it('should group items by key', () => {
			const items = [{ cat: 'a', val: 1 }, { cat: 'b', val: 2 }, { cat: 'a', val: 3 }];
			const grouped = byKey(items, itm => itm.cat);
			expect(grouped.a).toEqual([{ cat: 'a', val: 1 }, { cat: 'a', val: 3 }]);
			expect(grouped.b).toEqual([{ cat: 'b', val: 2 }]);
		});

		it('should iterate over sparse array holes', () => {
			const sparseArr: (number | undefined)[] = [1];
			sparseArr[3] = 4; // indices 1 and 2 are sparse holes
			const grouped = byKey(sparseArr, itm => (itm === undefined ? 'missing' : 'present'));
			expect(grouped.present).toEqual([1, 4]);
			expect(grouped.missing).toEqual([undefined, undefined]);
		});
	});

	describe('sortKey', () => {
		it('should sort array of objects by property key', () => {
			const items = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
			sortKey(items, 'name');
			expect(items).toEqual([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]);
		});
	});
});
