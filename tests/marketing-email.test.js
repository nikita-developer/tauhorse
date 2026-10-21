import test from 'node:test'
import assert from 'node:assert/strict'
import {buildMarketingHtml} from '../server/utils/marketing-email.js'

test('marketing template escapes campaign content and has CTA',()=>{
  const html=buildMarketingHtml({subject:'Скидка <20%>',body:'Привет <script>alert(1)</script>\n\nТолько сегодня',appUrl:'https://shop.test'})
  assert.match(html,/TauHorse/)
  assert.match(html,/Скидка &lt;20%&gt;/)
  assert.doesNotMatch(html,/<script>/)
  assert.match(html,/\?on_sale=1#catalog/)
  assert.match(html,/\/account/)
})

test('marketing email sale button points to real catalog route',()=>{
  const html=buildMarketingHtml({subject:'Акция',body:'Текст',appUrl:'https://example.test'})
  assert.match(html,/https:\/\/example\.test\/\?on_sale=1#catalog/)
})
