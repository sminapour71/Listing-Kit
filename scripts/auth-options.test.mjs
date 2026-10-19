import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnPath,authCookieOptions} from '../app/lib/auth-options.ts';
test('return destinations stay inside the private workspace',()=>{
 for(const value of ['https://evil.example','//evil.example','/auth/callback','/\\evil.example','/api/properties','/?next=https://evil.example',null,[]])assert.equal(safeReturnPath(value),'/workspace');
 for(const value of ['/','/#listings','/#brand-profile','/#create-listing','/#marketing-package'])assert.equal(safeReturnPath(value),'/workspace'+value.slice(1));
 for(const value of ['/workspace','/workspace#listory-agents','/workspace#brand-profile'])assert.equal(safeReturnPath(value),value);
 for(const value of ['/workspace/../api','/workspace?next=evil','/workspace#unknown','/workspace//evil'])assert.equal(safeReturnPath(value),'/workspace');
});
test('real site session cookies are private and secure; only exact local hosts allow HTTP',()=>{
 for(const host of ['listing-kit-pink.vercel.app','preview.vercel.app','localhost.evil.example','127.0.0.1.evil.example','']){const c=authCookieOptions(host);assert.equal(c.secure,true);assert.equal(c.httpOnly,true);assert.equal(c.sameSite,'lax');}
 assert.equal(authCookieOptions('127.0.0.1:3100').secure,false);assert.equal(authCookieOptions('localhost:3000').secure,false);
});
