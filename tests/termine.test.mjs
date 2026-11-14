// Tests für Wiederholungen, Geburtstage und Überschneidungen. Starten mit: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../app/js/termine.js';

test('Wiederholungen, Geburtstage, Überschneidungen', () => {
const v = (t, a, b) => T.vorkommen({ bis: null, ...t }, a, b);
assert.deepEqual(v({ datum: '2026-11-14', wiederholung: 'woechentlich' }, '2026-11-01', '2026-12-05'), ['2026-11-14','2026-11-21','2026-11-28','2026-12-05']);
assert.deepEqual(v({ datum: '2026-11-14', wiederholung: 'woechentlich' }, '2026-12-01', '2026-12-31'), ['2026-12-05','2026-12-12','2026-12-19','2026-12-26']);
assert.deepEqual(v({ datum: '2026-11-14', wiederholung: 'woechentlich', bis: '2026-11-27' }, '2026-11-01', '2026-12-31'), ['2026-11-14','2026-11-21']);
assert.deepEqual(v({ datum: '2026-01-31', wiederholung: 'monatlich_datum' }, '2026-01-01', '2026-05-31'), ['2026-01-31','2026-03-31','2026-05-31']);
// 14.11.2026 = 2. Samstag
assert.equal(T.wiederholungsOptionen('2026-11-14')[3].text, 'Jeden Monat am zweiten Samstag');
assert.deepEqual(v({ datum: '2026-11-14', wiederholung: 'monatlich_wochentag' }, '2026-11-01', '2027-02-28'), ['2026-11-14','2026-12-12','2027-01-09','2027-02-13']);
// 28.11.2026 = 4. Samstag; 30.11.2026 = Montag, 5. Woche -> letzter Montag
assert.deepEqual(v({ datum: '2026-11-30', wiederholung: 'monatlich_wochentag' }, '2026-11-01', '2027-02-28'), ['2026-11-30','2026-12-28','2027-01-25','2027-02-22']);
assert.equal(T.wiederholungsOptionen('2026-11-30')[3].text, 'Jeden Monat am letzten Montag');
assert.deepEqual(v({ datum: '2024-02-29', wiederholung: 'jaehrlich' }, '2024-01-01', '2028-12-31'), ['2024-02-29','2028-02-29']);
assert.deepEqual(v({ datum: '2026-11-14', wiederholung: 'keine' }, '2026-11-14', '2026-11-14'), ['2026-11-14']);
assert.equal(T.wochentag('2026-11-14'), 5);
assert.equal(T.datumLang('2026-11-14'), 'Samstag, 14. November');
// Geburtstage
const g = T.geburtstageImBereich([{ aktiv: true, geburtstag: '1992-02-29', geburtsjahr_anzeigen: true }], '2027-01-01', '2027-12-31');
assert.deepEqual(g.map(x => [x.datum, x.alter]), [['2027-02-28', 35]]);
// Überschneidungen
const termine = [{ id: 'p', typ: 'probe', datum: '2026-11-18', wiederholung: 'woechentlich', beginn: '19:00', ende: '22:00', ganztags: false, bis: null }];
const ausn = [{ termin_id: 'p', datum: '2026-11-25', abgesagt: true }];
const neu = (d, b, e) => ({ typ: 'reservierung', datum: d, beginn: b, ende: e, ganztags: false, wiederholung: 'keine', bis: null });
assert.equal(T.ueberschneidungen(neu('2026-11-18', '21:00', '23:00'), termine, ausn).length, 1);
assert.equal(T.ueberschneidungen(neu('2026-11-18', '22:00', '23:00'), termine, ausn).length, 0);
assert.equal(T.ueberschneidungen(neu('2026-11-25', '19:00', '23:00'), termine, ausn).length, 0);
assert.equal(T.ueberschneidungen(neu('2026-11-18', '23:00', '20:00'), termine, ausn).length, 0); // 23 bis 20 Uhr = über Mitternacht
const e = T.eintraegeImBereich(termine, ausn, '2026-11-01', '2026-11-30');
assert.deepEqual(e.map(x => [x.datum, x.abgesagt]), [['2026-11-18', false], ['2026-11-25', true]]);
});
