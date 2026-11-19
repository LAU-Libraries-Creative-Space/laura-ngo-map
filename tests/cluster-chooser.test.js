import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped component's output and actual selection handlers, without
// substituting a duplicate implementation of the cluster chooser.
const source = fs.readFileSync(new URL('../app-source/assets/Atlas-DHQNhZ1H.js', import.meta.url), 'utf8');
const component = source.slice(source.indexOf('function iu({'), source.lastIndexOf('export {'));
function fixture(items) {
  const selected = [], states = [], values = [true, false, 'day', items, null]; let index = 0;
  const runtime = {jsx: (type, props) => ({type, props}), jsxs: (type, props) => ({type, props})};
  const context = {_: {useRef: () => ({current: null}), useEffect() {}, useState: () => {
    const stateIndex = index++; return [values[stateIndex], value => states.push([stateIndex, value])];
  }}, $: runtime};
  for (const name of ['a', 'o', 'u', 'm', 'p', 'h', 'g', 'd', 's', 'n', 'f', 'i']) context[name] = () => null;
  const render = vm.runInNewContext(`(${component})`, context);
  const tree = render({items: items || [], selected: null, onSelect: item => selected.push(item)});
  function find(node, predicate) {
    if (!node) return null;
    if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
    if (typeof node !== 'object') return null;
    return predicate(node) ? node : find(node.props?.children, predicate);
  }
  return {tree, selected, states, find: predicate => find(tree, predicate)};
}

test('A tapped cluster renders every foundation with an accessible chooser and direct detail action', () => {
  const items = [{id: 1, name: 'Foundation A'}, {id: 2, name: 'Foundation B'}], f = fixture(items);
  const dialog = f.find(node => node.props?.role === 'dialog');
  assert.equal(dialog.props['aria-labelledby'], 'atlas-cluster-title');
  const list = f.find(node => node.props?.className === 'atlas-cluster-list');
  assert.equal(list.props.children.length, 2);
  list.props.children[1].props.onClick();
  assert.equal(f.selected[0], items[1]);
  assert.equal(f.states.at(-1)[0], 3); assert.equal(f.states.at(-1)[1], null);
});

test('The chooser supports its close button and Escape, and is absent before selecting a cluster', () => {
  assert.equal(fixture(null).find(node => node.props?.role === 'dialog'), null);
  const f = fixture([{id: 1, name: 'A'}, {id: 2, name: 'B'}]);
  f.find(node => node.props?.['aria-label'] === 'Close area NGOs').props.onClick();
  let stopped = false;
  f.find(node => node.props?.role === 'dialog').props.onKeyDown({key: 'Escape', stopPropagation() { stopped = true; }});
  assert.equal(stopped, true); assert.equal(f.states.length, 2);
});

test('Large clusters retain all choices for the scrollable phone list', () => {
  const items = Array.from({length: 59}, (_, id) => ({id, name: `Foundation ${id}`})), f = fixture(items);
  const choices = f.find(node => node.props?.className === 'atlas-cluster-list').props.children;
  assert.equal(choices.length, 59);
  choices.at(-1).props.onClick(); assert.equal(f.selected[0], items.at(-1));
});
