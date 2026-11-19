import test from 'node:test';
import assert from 'node:assert/strict';
import {findCurrentLocation, locationErrorMessage} from '../app-source/assets/geolocation.js';

const position = {coords: {longitude: 35.51, latitude: 33.89}};
function fixture() {
  const calls = [];
  const geolocation = {getCurrentPosition(success, failure, options) { calls.push({success, failure, options}); }};
  return {calls, request: options => findCurrentLocation({geolocation, secureContext: true, ...options})};
}

test('Requests permission immediately from the button handler and preserves valid device coordinates', async () => {
  const f = fixture(), result = f.request();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].options.enableHighAccuracy, false);
  f.calls[0].success(position);
  assert.equal(await result, position);
});

for (const code of [2, 3]) test(`Retries with fresh GPS after a network location failure (${code})`, async () => {
  const f = fixture(), result = f.request();
  f.calls[0].failure({code});
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].options.enableHighAccuracy, true);
  assert.equal(f.calls[1].options.maximumAge, 0);
  assert.ok(f.calls[1].options.timeout > f.calls[0].options.timeout);
  f.calls[1].success(position);
  assert.equal(await result, position);
});

test('Permission denial has actionable help and never prompts a second time', async () => {
  const f = fixture(), result = f.request();
  f.calls[0].failure({code: 1});
  await assert.rejects(result, error => error.code === 1);
  assert.equal(f.calls.length, 1);
  assert.match(locationErrorMessage({code: 1}), /browser settings.*Location Services/);
});

test('A timed-out GPS retry ends with a retryable error', async () => {
  const f = fixture(), result = f.request();
  f.calls[0].failure({code: 3}); f.calls[1].failure({code: 3});
  await assert.rejects(result, error => error.code === 3);
  assert.equal(f.calls.length, 2);
  assert.match(locationErrorMessage({code: 3}), /try again.*starting town/);
});

test('Closing the dialog or choosing a town cancels location and ignores a late GPS result', async () => {
  const f = fixture(), controller = new AbortController(), result = f.request({signal: controller.signal});
  controller.abort();
  f.calls[0].success(position); f.calls[0].failure({code: 3});
  await assert.rejects(result, {name: 'AbortError'});
  assert.equal(f.calls.length, 1);
});

test('Already cancelled requests never access the device', async () => {
  const f = fixture(), controller = new AbortController(); controller.abort();
  await assert.rejects(f.request({signal: controller.signal}), {name: 'AbortError'});
  assert.equal(f.calls.length, 0);
});

test('Late callbacks from the first attempt cannot overwrite a fresh GPS result', async () => {
  const f = fixture(), result = f.request(); f.calls[0].failure({code: 3});
  f.calls[0].success({coords: {longitude: 0, latitude: 0}});
  f.calls[1].success(position); assert.equal(await result, position);
});

test('Invalid coordinates are retried and never passed to the map', async () => {
  const f = fixture(), result = f.request();
  f.calls[0].success({coords: {longitude: NaN, latitude: 33.89}});
  assert.equal(f.calls.length, 2);
  f.calls[1].success({coords: {longitude: 181, latitude: 33.89}});
  await assert.rejects(result, error => error.code === 2);
});

test('HTTP phone previews and unsupported browsers show specific manual-location guidance', async () => {
  const f = fixture();
  await assert.rejects(f.request({secureContext: false}), error => error.code === 'insecure');
  await assert.rejects(findCurrentLocation({geolocation: {}, secureContext: true}), error => error.code === 'unsupported');
  assert.equal(f.calls.length, 0);
  assert.match(locationErrorMessage({code: 'insecure'}), /HTTPS/);
  assert.match(locationErrorMessage({code: 'unsupported'}), /Safari or Chrome.*starting town/);
});

test('A browser security exception becomes permission guidance instead of a crashed handler', async () => {
  await assert.rejects(findCurrentLocation({secureContext: true, geolocation: {getCurrentPosition() {
    throw Object.assign(new Error('blocked'), {name: 'SecurityError'});
  }}}), error => error.code === 1);
});
