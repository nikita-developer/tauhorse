<template>
  <section v-if="sortedRules.length" class="discount-tiers" :class="{'discount-tiers--compact': compact}">
    <div class="discount-tiers__intro">
      <span>Выгоднее при большом заказе</span>
      <strong>Скидка растёт с суммой корзины</strong>
      <p v-if="nextRule">Добавьте товаров ещё на {{ money(Math.max(0, Number(nextRule.min_subtotal) - Number(subtotal || 0))) }}, чтобы получить скидку {{ Number(nextRule.percent) }}%.</p>
      <p v-else-if="subtotal">У вас максимальная доступная скидка от суммы заказа.</p>
      <p v-else>Скидка рассчитывается автоматически по стоимости товаров после товарных акций.</p>
    </div>
    <div class="discount-tiers__levels">
      <div v-for="rule in sortedRules" :key="rule.id" class="discount-tiers__level" :class="{'is-active': Number(subtotal || 0) >= Number(rule.min_subtotal)}">
        <span>от {{ money(rule.min_subtotal) }}</span><strong>−{{ Number(rule.percent) }}%</strong>
      </div>
    </div>
  </section>
</template>
<script setup>
const props=defineProps({rules:{type:Array,default:()=>[]},subtotal:{type:Number,default:0},compact:{type:Boolean,default:false}})
const sortedRules=computed(()=>[...props.rules].filter(r=>r?.is_active!==false).sort((a,b)=>Number(a.min_subtotal)-Number(b.min_subtotal)))
const nextRule=computed(()=>sortedRules.value.find(r=>Number(r.min_subtotal)>Number(props.subtotal||0))||null)
const money=value=>`${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number(value||0))} ₽`
</script>
<style scoped lang="scss">
.discount-tiers{display:grid;grid-template-columns:minmax(230px,.75fr) minmax(0,1.25fr);gap:16px;align-items:center;margin:18px 0;padding:18px 20px;border:1px solid rgba(111,82,48,.12);border-radius:20px;background:linear-gradient(135deg,#fffaf2,#f2e7d6);box-shadow:0 10px 26px rgba(53,36,18,.05)}
.discount-tiers__intro{display:grid;gap:4px}.discount-tiers__intro>span{color:#8a6842;font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.discount-tiers__intro>strong{color:#38291a;font-size:17px}.discount-tiers__intro p{margin:2px 0 0;color:#74695d;font-size:12px;line-height:1.5}.discount-tiers__levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}.discount-tiers__level{display:grid;justify-items:center;align-content:center;gap:5px;min-height:62px;padding:10px 9px;border:1px solid rgba(111,82,48,.1);border-radius:13px;background:rgba(255,255,255,.72);color:#796b5b;text-align:center}.discount-tiers__level span{font-size:11px;line-height:1.2;white-space:nowrap}.discount-tiers__level strong{color:#6f5131;font-size:16px;line-height:1;white-space:nowrap}.discount-tiers__level.is-active{border-color:rgba(59,112,73,.22);background:#edf6ee}.discount-tiers__level.is-active strong{color:#397049}.discount-tiers--compact{grid-template-columns:1fr;margin:14px 0 0;padding:14px}.discount-tiers--compact .discount-tiers__levels{grid-template-columns:repeat(auto-fit,minmax(100px,1fr))}@media(max-width:760px){
  .discount-tiers{grid-template-columns:1fr;gap:9px;margin:10px 0;padding:12px 13px;border-radius:17px}
  .discount-tiers__intro{gap:2px}
  .discount-tiers__intro>span{font-size:8px;letter-spacing:.07em}
  .discount-tiers__intro>strong{font-size:15px;line-height:1.2}
  .discount-tiers__intro p{margin-top:1px;font-size:10.5px;line-height:1.35}
  .discount-tiers__levels{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
  .discount-tiers__level{gap:3px;min-height:48px;padding:7px 5px;border-radius:11px}
  .discount-tiers__level span{font-size:9px}
  .discount-tiers__level strong{font-size:15px}
}
@media(max-width:380px){
  .discount-tiers{padding:11px}
  .discount-tiers__intro p{font-size:10px}
  .discount-tiers__level{min-height:45px;padding-inline:3px}
  .discount-tiers__level span{font-size:8px}
  .discount-tiers__level strong{font-size:14px}
}
</style>
