import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasAppAccess, requestScopeFor } from './accessScope';
import type { CurrentUser } from './currentUser';
import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { EvaluatedRequestFields } from './types';

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

const user = (roleNames: string[] = ['Discount Basic User']): CurrentUser => ({ systemUserId: ME, roleNames });
const request = (fields: Partial<Dis_discountrequests> = {}) => fields as Dis_discountrequests;
const evaluation = (fields: Partial<EvaluatedRequestFields>) => fields as EvaluatedRequestFields;

test('Discount App Admin sees everything on both screens with no server filter', () => {
  for (const kind of ['authorizedBy', 'enteredBy'] as const) {
    const scope = requestScopeFor(kind, user(['Discount App Admin']));
    assert.equal(scope.canView, true);
    assert.equal(scope.filter, undefined);
    assert.equal(scope.unresolved, undefined);
    assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: OTHER, agentSystemUserId: OTHER })), true);
  }
});

test('only Discount App Admin and Discount Basic User get into the app', () => {
  assert.equal(hasAppAccess(user(['Discount App Admin'])), true);
  assert.equal(hasAppAccess(user(['Discount Basic User'])), true);
  assert.equal(hasAppAccess(user(['System Administrator'])), false);
  assert.equal(hasAppAccess(user([])), false);
  assert.equal(hasAppAccess(null), false);
});

test('a user without an app role sees nothing, even as System Administrator', () => {
  for (const roles of [['System Administrator'], ['Basic User'], []]) {
    assert.equal(requestScopeFor('authorizedBy', user(roles)).canView, false);
    assert.equal(requestScopeFor('enteredBy', user(roles)).canView, false);
  }
});

test('unresolved user sees nothing', () => {
  assert.equal(requestScopeFor('authorizedBy', null).canView, false);
  assert.equal(requestScopeFor('enteredBy', { systemUserId: 'not-a-guid', roleNames: [] }).canView, false);
});

test('Authorized By scope fully fetches only own rows and claims unresolved ones by DotCare name', () => {
  const scope = requestScopeFor('authorizedBy', user());
  assert.equal(scope.filter, `_dis_authorizedbyname_value eq ${ME}`);
  assert.deepEqual(scope.unresolved, {
    filter: '_dis_authorizedbyname_value eq null',
    nameField: 'dis_authorizedbynamedotcare',
    systemUserId: ME,
  });
  assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: ME })), true);
  assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: OTHER })), false);
  assert.equal(scope.includes(request(), evaluation({})), false);
});

test('Entered By scope uses the Agent lookup', () => {
  const scope = requestScopeFor('enteredBy', user());
  assert.equal(scope.filter, `_dis_agent_value eq ${ME}`);
  assert.equal(scope.unresolved?.nameField, 'dis_agentdotcare');
  assert.equal(scope.includes(request(), evaluation({ agentSystemUserId: ME.toUpperCase() })), true);
  assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: ME })), false);
});

test('a decision-locked request keeps its persisted owner over a fresh evaluation', () => {
  const scope = requestScopeFor('authorizedBy', user());
  const locked = request({ dis_decisionlocked: true, _dis_authorizedbyname_value: ME });
  assert.equal(scope.includes(locked, evaluation({ authorizedBySystemUserId: OTHER })), true);
  const lockedOther = request({ dis_decisionlocked: true, _dis_authorizedbyname_value: OTHER });
  assert.equal(scope.includes(lockedOther, evaluation({ authorizedBySystemUserId: ME })), false);
});
