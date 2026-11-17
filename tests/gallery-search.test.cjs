const {test} = require('node:test');
const assert = require('node:assert/strict');
const {find, paginate} = require('../collection/search.js');
const issues = [
  {id: 2, title: 'F-35 航母', images: [{caption:'F-35B 舰载战斗机'}, {caption:'核潜艇'}]},
  {id: 1, title: '潜艇', images: []}
];
test('搜索标题和每条图注，忽略大小写并保留图片位置', () => {
  assert.deepEqual(find(issues, ' f-35 ').map(x => [x.issue.id, x.index]), [[2,-1],[2,0]]);
  assert.deepEqual(find(issues, '潜艇').map(x => [x.issue.id, x.index]), [[2,1],[1,-1]]);
  assert.deepEqual(find(issues, 'Ｆ－３５').map(x => [x.issue.id, x.index]), [[2,-1],[2,0]]);
  assert.equal(find(issues, '无结果').length, 0);
  assert.equal(find(issues, ' ').length, 0);
});
test('分页限制范围，空结果和非法页码安全处理', () => {
  const many = Array.from({length: 41}, (_,i) => i);
  assert.deepEqual(paginate(many, 2).items, many.slice(20,40));
  assert.equal(paginate(many, 999).page, 3);
  assert.equal(paginate(many, '2.5').page, 1);
  assert.equal(paginate([], 9).pages, 1);
});
