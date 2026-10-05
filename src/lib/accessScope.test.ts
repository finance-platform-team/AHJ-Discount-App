import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestScopeFor } from './accessScope';
import type { CurrentUser } from './currentUser';
import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { EvaluatedRequestFields } from './types';

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

const user = (roleNames: string[] = ['Discount Basic User']): CurrentUser => ({ systemUserId: ME, roleNames });
const request = (fields: Partial<Dis_discountrequests> = {}) => fields as Dis_discountrequests;
const evaluation = (fields: Partial<EvaluatedRequestFields>) => fields as EvaluatedRequestFields;

test('full-access role sees everything with no server filter', () => {
  const scope = requestScopeFor('authorizedBy', user(['System Administrator']));
  assert.equal(scope.canView, true);
  assert.equal(scope.filter, undefined);
  assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: OTHER })), true);
});

test('unresolved user sees nothing', () => {
  assert.equal(requestScopeFor('authorizedBy', null).canView, false);
  assert.equal(requestScopeFor('enteredBy', { systemUserId: 'not-a-guid', roleNames: [] }).canView, false);
});

test('Authorized By scope filters server-side on the lookup and keeps unresolved rows for evaluation', () => {
  const scope = requestScopeFor('authorizedBy', user());
  assert.equal(scope.filter, `(_dis_authorizedbyname_value eq ${ME} or _dis_authorizedbyname_value eq null)`);
  assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: ME })), true);
  assert.equal(scope.includes(request(), evaluation({ authorizedBySystemUserId: OTHER })), false);
  assert.equal(scope.includes(request(), evaluation({})), false);
});

test('Entered By scope uses the Agent lookup', () => {
  const scope = requestScopeFor('enteredBy', user());
  assert.equal(scope.filter, `(_dis_agent_value eq ${ME} or _dis_agent_value eq null)`);
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
