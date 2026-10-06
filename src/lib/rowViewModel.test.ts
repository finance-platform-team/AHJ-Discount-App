import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRowViewModel } from './rowViewModel';
import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { EvaluatedRequestFields } from './types';

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

const row = (fields: Partial<Dis_discountrequests>, authorizedBySystemUserId: string | undefined, viewer: string | null) =>
  buildRowViewModel(
    fields as Dis_discountrequests,
    { authorizedBySystemUserId } as EvaluatedRequestFields,
    new Map(),
    viewer
  );

test('only the Authorized By can decide an open request', () => {
  assert.equal(row({}, ME, ME).canDecide, true);
  assert.equal(row({}, ME, ME.toUpperCase()).canDecide, true);
  assert.equal(row({}, OTHER, ME).canDecide, false);
  assert.equal(row({}, undefined, ME).canDecide, false);
  assert.equal(row({}, ME, null).canDecide, false);
});

test('a decision-locked request cannot be decided again, even by its Authorized By', () => {
  assert.equal(row({ dis_decisionlocked: true }, ME, ME).canDecide, false);
});
