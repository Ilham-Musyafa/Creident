import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { draftFormValues } from './draftForm';
import { NewDealForm } from './NewDealForm';
import { TransactionFilters } from './TransactionFilters';
import { DraftRowMenu } from './DraftRowMenu';
import { transactionRow, matchesTransactionFilter, readTransactionFilter, transactionFilterKeys, groupTransactionRows } from './transactionsView';
import { changedDraftFields } from '../lib/draftTerms';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {}, push() {} }) }));
const values = { item: 'Camera', amount: '25.00', termsJson: JSON.stringify({ condition: 'Used - Good', category: 'electronics-computers', subcategory: 'electronics-computers-cameras', description: 'Original description', includedItems: ['Cable','Cap'], criteria: ['Lens works','No cracks'], demo: true, evidenceCode: 'KEEP-ME' }) };
const tx = { ...values, id: 'draft', status: 'DRAFT' as const, buyerId: 'buyer', sellerId: 'seller', currency: 'USD', captured: false };
const now = '2026-10-31T12:00:00Z';
describe('Draft form reuse and filter presentation', () => {
  it('prefills all visible fields without changing hidden metadata', () => {
    expect(draftFormValues(values)).toEqual({ item: 'Camera', amount:'25.00', condition:'Used - Good', category:'electronics-computers', subcategory:'electronics-computers-cameras', description:'Original description', includedItems:'Cable\nCap', criteria:'Lens works\nNo cracks' });
    expect(JSON.parse(values.termsJson).evidenceCode).toBe('KEEP-ME');
    const html = renderToStaticMarkup(createElement(NewDealForm, { simulated:true,time:{shipByDays:3,inspectionDays:2,evidenceDays:2},draft:{id:'draft',revision:'a'.repeat(64),values:draftFormValues(values),terms:JSON.parse(values.termsJson)} }));
    for (const text of ['Save changes','25.00','Original description','Cable','Cap','No cracks','electronics-computers-cameras']) expect(html).toContain(text);
    expect(html).not.toContain('>Create deal<');
  });
  it('preserves legacy condition text and maps a legacy category into the existing controls', () => {
    const legacy = { ...values, termsJson: '{"condition":"Working, small scratches","category":"camera"}' };
    const form = draftFormValues(legacy);
    expect(form.condition).toBe('Working, small scratches'); expect(form.subcategory).toBe('electronics-computers-cameras');
    const html=renderToStaticMarkup(createElement(NewDealForm,{simulated:true,time:{shipByDays:3,inspectionDays:2,evidenceDays:2},draft:{id:'draft',revision:'a'.repeat(64),values:form,terms:JSON.parse(legacy.termsJson)}}));
    const choice = (html.match(/<input\b[^>]*>/g) ?? []).find(tag => tag.includes('value="Working, small scratches"'));
    expect(choice).toContain('checked=""');
    expect(choice).toContain('name="condition"');
  });
  it('makes edit available only to the seller before any buyer acceptance', () => {
    expect(transactionRow(tx,'seller',now,['seller']).editable).toBe(true);
    expect(transactionRow(tx,'seller',now,['buyer']).editable).toBe(false);
    for(const role of ['buyer','reviewer'] as const) expect(transactionRow(tx,role,now).editable).toBe(false);
    expect(transactionRow({...tx,status:'TERMS_LOCKED'},'seller',now).editable).toBe(false);
    const menu=renderToStaticMarkup(createElement(DraftRowMenu,{id:tx.id}));
    expect(menu).toContain('href="/deals/draft/edit"'); expect(menu).toContain('Edit deal'); expect(menu).not.toContain('Delete');
  });
  it('counts all DRAFT deals for the seller, including buyer-first drafts that cannot be edited', () => {
    const draft=transactionRow(tx,'seller',now,['buyer']);const active=transactionRow({...tx,id:'active',status:'AUTHORIZED'},'seller',now);
    expect([draft,active].filter(r=>matchesTransactionFilter(r,'draft','seller'))).toEqual([draft]);
    for(const role of ['buyer','reviewer'] as const) {expect(matchesTransactionFilter(draft,'draft',role)).toBe(false);expect(readTransactionFilter('draft',role)).toBe('all');}
    expect(readTransactionFilter('draft','seller')).toBe('draft');
    expect(groupTransactionRows([draft],now)[0]?.key).toBe('action');
  });
  it('shows Drafts (n) only for a seller with a nonzero count; existing filters remain in order', () => {
    expect(transactionFilterKeys('seller',2)).toEqual(['all','draft','action','active','review','closed']);
    for(const [role,count] of [['seller',0],['buyer',2],['reviewer',2]] as const){
      expect(transactionFilterKeys(role,count)).not.toContain('draft');
      const html=renderToStaticMarkup(createElement(TransactionFilters,{role,selected:'all',count:()=>count,onChange(){}}));
      expect(html).not.toContain('Drafts');
    }
    const html=renderToStaticMarkup(createElement(TransactionFilters,{role:'seller',selected:'draft',count:()=>2,onChange(){}}));
    expect(html).toContain('Drafts');expect(html).toContain('(2)');expect(html).toContain('aria-pressed="true"');
  });
  it('logs only known field names and one fixed other-fields marker, including null removal', () => {
    expect(changedDraftFields({...values,termsJson:'{"condition":null,"private field name":"quoted"}'},{...values,termsJson:'{}'})).toEqual(['terms.condition','terms.other']);
  });
});
