#!/usr/bin/env node
/**
 * Exhaustive workflow trigger verification — all 21 workflows × 5 languages.
 *
 * Coverage:
 *   ① Positive triggers (EN + multilingual) for every workflow
 *   ② Exclude patterns — verify correct blocking
 *   ③ Cross-workflow boundaries — priority tie-breaking
 *   ④ Edge cases — plurals, Unicode, intervening words, word order
 *   ⑤ Override / skip mechanisms
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { detectIntent } = require('../lib/wr-detect.cjs');

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../workflows.json'), 'utf8'));

let passed = 0;
let failed = 0;
const failures = [];

function test(section, desc, prompt, expected, expectDetected = true) {
    const result = detectIntent(prompt, config);

    if (!expectDetected) {
        if (!result.detected && !result.skipped) {
            passed++;
            return;
        }
        if (result.skipped) {
            passed++;
            return;
        }
        failed++;
        failures.push({ section, desc, prompt, expected: 'no detection', got: result.workflowId });
        return;
    }

    if (!result.detected) {
        failed++;
        failures.push({ section, desc, prompt, expected, got: 'NO MATCH', alts: [] });
        return;
    }

    if (result.workflowId === expected) {
        passed++;
    } else {
        failed++;
        failures.push({
            section,
            desc,
            prompt,
            expected,
            got: result.workflowId,
            alts: result.alternatives || []
        });
    }
}

console.log('══════════════════════════════════════════════════');
console.log('  Workflow Trigger Exhaustive Verification');
console.log('  21 workflows × 5 languages + edge cases');
console.log('══════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════
// 1. BUGFIX (priority 20)
// ═══════════════════════════════════════════════════
const S = 'bugfix';
test(S, 'EN: standalone bug', 'there is a bug', 'bugfix');
test(S, 'EN: fix something', 'fix the login page', 'bugfix');
test(S, 'EN: broken', 'the sidebar is broken', 'bugfix');
test(S, 'EN: crash', 'app crash on startup', 'bugfix');
test(S, 'EN: exception', 'unhandled exception thrown', 'bugfix');
test(S, 'EN: standalone error', 'there is an error', 'bugfix');
test(S, 'EN: error with preposition', 'error in the database layer', 'bugfix');
test(S, 'EN: not working', 'login not working', 'bugfix');
test(S, "EN: doesn't work", "pagination doesn't work", 'bugfix');
test(S, 'EN: debug', 'debug the memory leak', 'bugfix');
test(S, 'EN: regression', 'regression in v2.1', 'bugfix');
test(S, 'EN: returning errors', 'API returning errors', 'bugfix');
test(S, 'EN: error occurred', 'error occurred in production', 'bugfix');
test(S, 'EN: an error happened', 'an error happened', 'bugfix');
test(S, 'EN: fix it', 'fix it please', 'bugfix');
test(S, 'EN: fix this', 'fix this issue', 'bugfix');
test(S, 'EN: fix that', 'fix that bug', 'bugfix');
test(S, 'EN: failed', 'the deployment failed', 'bugfix');
test(S, "EN: isn't working", "the button isn't working", 'bugfix');
test(S, "EN: won't work", "it won't work properly", 'bugfix');
test(S, 'EN: troubleshoot', 'troubleshoot the API issue', 'bugfix');
test(S, 'EN: diagnose', 'diagnose the problem', 'bugfix');
test(S, 'VI: sửa lỗi', 'sửa lỗi đăng nhập', 'bugfix');
test(S, 'VI: hỏng', 'trang chủ bị hỏng', 'bugfix');
test(S, 'VI: không hoạt động', 'chức năng không hoạt động', 'bugfix');
test(S, 'VI: gỡ lỗi', 'gỡ lỗi bộ nhớ', 'bugfix');
test(S, 'VI: không chạy', 'không chạy được', 'bugfix');
test(S, 'ZH: 修复bug', '修复登录bug', 'bugfix');
test(S, 'ZH: 错误', '系统出现错误', 'bugfix');
test(S, 'ZH: 不工作', '功能不工作', 'bugfix');
test(S, 'ZH: 崩溃', '应用崩溃了', 'bugfix');
test(S, 'ZH: 不运行', '不运行了', 'bugfix');
test(S, 'JA: バグ修正', 'バグを修正してください', 'bugfix');
test(S, 'JA: エラー', 'エラーが出ている', 'bugfix');
test(S, 'JA: 動かない', 'ボタンが動かない', 'bugfix');
test(S, 'JA: クラッシュ', 'クラッシュする', 'bugfix');
test(S, 'JA: 直す', '直してください', 'bugfix');
test(S, 'KO: 버그 수정', '버그를 수정해주세요', 'bugfix');
test(S, 'KO: 오류', '오류가 발생', 'bugfix');
test(S, 'KO: 작동 안', '작동 안 함', 'bugfix');
test(S, 'KO: 크래시', '크래시 났어요', 'bugfix');
test(S, 'KO: 고치다', '고쳐주세요', 'bugfix');
// Excludes
test(S, 'EXCL: implement new (→ feature)', 'implement new login', 'feature');
test(S, 'EXCL: feature word', 'add a feature for auth', 'feature');
test(S, 'EXCL: improve handling (→ refactor)', 'improve error handling code', 'refactor');
test(S, 'EXCL: how does (→ investigation)', 'how does error handling work', 'investigation');
test(S, 'EXCL: explain (→ investigation)', 'explain the error handling logic', 'investigation');
test(S, 'EXCL: investigate+crash (excluded by investigation)', 'investigate the code for crash handling', null, false);
test(S, 'EXCL: fix docs (excluded pattern - no match)', 'fix the documentation', 'documentation');
test(S, 'EXCL: fix readme (excluded pattern - no match)', 'fix the readme file', 'documentation');

// ═══════════════════════════════════════════════════
// 2. FEATURE (priority 10)
// ═══════════════════════════════════════════════════
const SF = 'feature';
test(SF, 'EN: implement feature', 'implement a new auth feature', 'feature');
test(SF, 'EN: add component', 'add a new sidebar component', 'feature');
test(SF, 'EN: new functionality', 'new functionality for search', 'feature');
test(SF, 'EN: build module', 'build a notification module', 'feature');
test(SF, 'EN: develop capability', 'develop export capability', 'feature');
test(SF, 'EN: add error handling', 'add error handling', 'feature');
test(SF, 'EN: feature: keyword', 'feature: dark mode', 'feature');
test(SF, 'EN: create service', 'create authentication service', 'feature');
test(SF, 'EN: make integration', 'make payment integration', 'feature');
test(SF, 'EN: add api endpoint', 'add api endpoint for users', 'feature');
test(SF, 'EN: implement validation', 'implement validation logic', 'feature');
test(SF, 'EN: build integration', 'build integration with stripe', 'feature');
test(SF, 'EN: create middleware', 'create middleware for auth', 'feature');
test(SF, 'VI: thêm tính năng', 'thêm tính năng tìm kiếm', 'feature');
test(SF, 'VI: tính năng mới (→ idea-to-pbi by priority)', 'tính năng mới cho dashboard', 'idea-to-pbi');
test(SF, 'VI: xây dựng module', 'xây dựng module thanh toán', 'feature');
test(SF, 'VI: phát triển chức năng', 'phát triển chức năng xuất file', 'feature');
test(SF, 'ZH: 添加功能', '添加搜索功能', 'feature');
test(SF, 'ZH: 新功能', '新功能开发', 'feature');
test(SF, 'ZH: 创建模块', '创建用户模块', 'feature');
test(SF, 'ZH: 构建功能', '构建支付功能', 'feature');
test(SF, 'JA: 機能追加', '検索機能を追加', 'feature');
test(SF, 'JA: 新機能', '新機能の開発', 'feature');
test(SF, 'JA: モジュール作成', 'モジュールを作成', 'feature');
test(SF, 'JA: 構築', '機能を構築する', 'feature');
test(SF, 'KO: 기능 추가', '검색 기능 추가', 'feature');
test(SF, 'KO: 새 기능', '새 기능 개발', 'feature');
test(SF, 'KO: 모듈 생성', '모듈 생성하기', 'feature');
test(SF, 'KO: 구현', '기능 구현하기', 'feature');
// Excludes
test(SF, 'EXCL: fix bug', 'fix the login bug', 'bugfix');
test(SF, 'EXCL: doc', 'update the readme doc', 'documentation');
test(SF, 'EXCL: add tests (no match, testing removed)', 'add tests for login', null, false);
test(SF, 'EXCL: add a test (no match, testing removed)', 'add a test for the API', null, false);
test(SF, 'EXCL: create documentation', 'create new documentation for API', 'documentation');
test(SF, 'EXCL: start new feature (→ pre-dev)', 'start new feature', 'pre-development');
test(SF, 'EXCL: create pbi (no match, refine-only removed)', 'create pbi from requirements', null, false);
test(SF, 'EXCL: create user stories (no match, story-only removed)', 'create user stories from PBI', null, false);

// ═══════════════════════════════════════════════════
// 3. REFACTOR (priority 25)
// ═══════════════════════════════════════════════════
const SR = 'refactor';
test(SR, 'EN: refactor', 'refactor the auth module', 'refactor');
test(SR, 'EN: clean up', 'clean up the database code', 'refactor');
test(SR, 'EN: improve code', 'improve the code quality', 'refactor');
test(SR, 'EN: improve performance', 'improve the rendering performance', 'refactor');
test(SR, 'EN: extract method', 'extract method from controller', 'refactor');
test(SR, 'EN: technical debt', 'address technical debt', 'refactor');
test(SR, 'VI: cải thiện code', 'cải thiện code xử lý', 'refactor');
test(SR, 'ZH: 重构代码', '重构代码结构', 'refactor');
test(SR, 'JA: リファクタリング', 'リファクタリング', 'refactor');
test(SR, 'JA: コード改善', 'コードの改善をしたい', 'refactor');
test(SR, 'KO: 리팩토링', '리팩토링', 'refactor');
test(SR, 'KO: 코드 개선', '코드 구조를 개선', 'refactor');
// Excludes
test(SR, 'EXCL: fix bug', 'fix the crash bug', 'bugfix');
test(SR, 'EXCL: new feature (refactor excluded → feature)', 'add a new feature and refactor', 'feature');

// ═══════════════════════════════════════════════════
// 4. DOCUMENTATION (priority 30)
// ═══════════════════════════════════════════════════
const SD = 'documentation';
test(SD, 'EN: update docs', 'update the docs', 'documentation');
test(SD, 'EN: write documentation', 'write documentation for the API', 'documentation');
test(SD, 'EN: readme', 'update readme', 'documentation');
test(SD, 'EN: add comment', 'add comment to the function', 'documentation');
test(SD, 'EN: write test documentation', 'write test documentation', 'documentation');
test(SD, 'EN: document the test API', 'document the test API', 'documentation');
test(SD, 'VI: cập nhật tài liệu', 'cập nhật tài liệu hướng dẫn', 'documentation');
test(SD, 'ZH: 更新文档', '更新文档说明', 'documentation');
test(SD, 'JA: ドキュメント更新', 'ドキュメントを更新', 'documentation');
test(SD, 'JA: 説明書', '説明書を作成', 'documentation');
test(SD, 'KO: 문서 업데이트', '문서를 업데이트', 'documentation');
test(SD, 'KO: 설명서', '설명서 작성', 'documentation');
// Excludes
test(SD, 'EXCL: implement (→ feature)', 'implement the search functionality', 'feature');
test(SD, 'EXCL: run tests (no match, testing removed)', 'run tests', null, false);
test(SD, 'EXCL: execute tests (no match, testing removed)', 'execute tests', null, false);

// ═══════════════════════════════════════════════════
// 5. REVIEW (priority 35)
// ═══════════════════════════════════════════════════
const SRV = 'review';
test(SRV, 'EN: review code', 'review the code changes', 'review');
test(SRV, 'EN: PR review', 'pr review for #42', 'review');
test(SRV, 'EN: code quality', 'check code quality', 'review');
test(SRV, 'EN: review this code', 'review this code', 'review');
test(SRV, 'EN: audit code', 'audit the code', 'review');
test(SRV, 'VI: review code', 'xem xét code thay đổi', 'review');
test(SRV, 'ZH: 审查代码', '审查代码更改', 'review');
test(SRV, 'JA: コードレビュー', 'コードレビューお願いします', 'review');
test(SRV, 'KO: 코드 리뷰', '코드 리뷰 해주세요', 'review');

// ═══════════════════════════════════════════════════
// 6. QUALITY-AUDIT (priority 32)
// ═══════════════════════════════════════════════════
const SQA = 'quality-audit';
test(SQA, 'EN: quality audit', 'quality audit the auth module', 'quality-audit');
test(SQA, 'EN: review best practices', 'review code for best practices', 'quality-audit');
test(SQA, 'EN: audit quality standards', 'audit code for quality standards', 'quality-audit');
test(SQA, 'EN: ensure quality', 'ensure quality of the API layer', 'quality-audit');
test(SQA, 'EN: no flaws', 'check there are no flaws in the service', 'quality-audit');
test(SQA, 'EN: best practices review', 'best practices review for the module', 'quality-audit');
test(SQA, 'EN: code quality audit', 'code quality audit needed', 'quality-audit');
test(SQA, 'EN: skill quality review', 'skill quality review of the commands', 'quality-audit');
test(SQA, 'EN: ensure no enhancement', 'ensure no enhancement needed', 'quality-audit');
test(SQA, 'EN: verify best quality', 'verify best quality of the codebase', 'quality-audit');
test(SQA, 'EN: check best practice', 'check best practice compliance', 'quality-audit');
test(SQA, 'EN: audit and improve', 'audit and improve the error handling', 'quality-audit');
test(SQA, 'EN: review and enhance', 'review and enhance the service layer', 'quality-audit');
test(SQA, 'VI: kiểm tra chất lượng', 'kiểm tra chất lượng code', 'quality-audit');
test(SQA, 'VI: đảm bảo chất lượng', 'đảm bảo chất lượng API', 'quality-audit');
test(SQA, 'ZH: 质量审查', '质量审查代码', 'quality-audit');
test(SQA, 'JA: 品質レビュー', '品質レビューお願いします', 'quality-audit');
test(SQA, 'KO: 품질 리뷰', '품질 리뷰 해주세요', 'quality-audit');
// Excludes
test(SQA, 'EXCL: review code (→ review)', 'review the code changes', 'review');
test(SQA, 'EXCL: pr review (→ review)', 'pr review for #42', 'review');
test(SQA, 'EXCL: fix the bug (→ bugfix)', 'fix the crash bug', 'bugfix');
test(SQA, 'EXCL: review and fix the (→ bugfix)', 'review and fix the error handling', 'bugfix');

// ═══════════════════════════════════════════════════
// 7. INVESTIGATION (priority 99)
// ═══════════════════════════════════════════════════
const SI = 'investigation';
test(SI, 'EN: how does X work', 'how does authentication work', 'investigation');
test(SI, 'EN: where is handler', 'where is the error handler', 'investigation');
test(SI, 'EN: explain code', 'explain this code logic', 'investigation');
test(SI, 'EN: understand', 'understand the caching system', 'investigation');
test(SI, 'EN: find function', 'find the function that processes payments', 'investigation');
test(SI, 'EN: investigate the code', 'investigate the code architecture', 'investigation');
test(SI, 'EN: walk through', 'walk through the auth flow', 'investigation');
test(SI, 'EN: what does this do', 'what does this code do', 'investigation');
test(SI, 'VI: làm sao hoạt động', 'xác thực làm sao hoạt động', 'investigation');
test(SI, 'VI: giải thích code', 'giải thích code logic', 'investigation');
test(SI, 'VI: điều tra', 'điều tra vấn đề bộ nhớ', 'investigation');
test(SI, 'ZH: 怎么工作', '认证怎么工作', 'investigation');
test(SI, 'ZH: 解释代码', '解释代码逻辑', 'investigation');
test(SI, 'ZH: 调查', '调查内存问题', 'investigation');
test(SI, 'JA: どう動く', 'どう動くか教えて', 'investigation');
test(SI, 'JA: コードどこ', 'コードはどこにある', 'investigation');
test(SI, 'JA: エラー処理を説明 (reverse word order)', 'エラー処理を説明してください', 'investigation');
test(SI, 'JA: 調査', '調査してください', 'investigation');
test(SI, 'KO: 어떻게 작동', '어떻게 작동하나요', 'investigation');
test(SI, 'KO: 코드 어디', '코드 어디에 있나요', 'investigation');
test(SI, 'KO: 오류 처리 설명 (reverse)', '오류 처리에 대해 설명해주세요', 'investigation');
test(SI, 'KO: 조사', '조사해주세요', 'investigation');
// Excludes
test(SI, 'EXCL: implement (→ feature)', 'implement new search feature', 'feature');
test(SI, 'EXCL: fix (→ bugfix)', 'fix the broken handler', 'bugfix');

// ═══════════════════════════════════════════════════
// 8. PRE-DEVELOPMENT (priority 15)
// ═══════════════════════════════════════════════════
const SP = 'pre-development';
test(SP, 'EN: before start coding', 'before I start coding the feature', 'pre-development');
test(SP, 'EN: start new feature', 'start new feature', 'pre-development');
test(SP, 'EN: starting a new feature', 'starting a new feature', 'pre-development');
test(SP, 'EN: start a new feature', 'start a new feature', 'pre-development');
test(SP, 'EN: pre-development check', 'pre-development check', 'pre-development');
test(SP, 'EN: prepare to code', 'prepare to code the dashboard', 'pre-development');
test(SP, 'EN: kick off feature', 'kick off new feature development', 'pre-development');
test(SP, 'VI: chuẩn bị code', 'chuẩn bị code tính năng mới', 'pre-development');
test(SP, 'ZH: 开发前检查', '开发前检查准备', 'pre-development');
test(SP, 'JA: 開発前', '開発前の準備', 'pre-development');
test(SP, 'KO: 개발 전', '개발 전 준비', 'pre-development');

// ═══════════════════════════════════════════════════
// 9. RELEASE-PREP (priority 5)
// ═══════════════════════════════════════════════════
const SRL = 'release-prep';
test(SRL, 'EN: prepare release', 'prepare for release', 'release-prep');
test(SRL, 'EN: release prep', 'release preparation needed', 'release-prep');
test(SRL, 'EN: before release', 'before we release v2', 'release-prep');
test(SRL, 'EN: pre-release check', 'pre-release check', 'release-prep');
test(SRL, 'EN: can we release', 'can we release now', 'release-prep');
test(SRL, 'EN: ready to ship', 'ready to ship', 'release-prep');
test(SRL, 'VI: chuẩn bị phát hành', 'chuẩn bị phát hành version mới', 'release-prep');
test(SRL, 'ZH: 发布准备', '发布准备检查', 'release-prep');
test(SRL, 'JA: リリース準備', 'リリース準備お願いします', 'release-prep');
test(SRL, 'KO: 릴리스 준비', '릴리스 준비 해주세요', 'release-prep');
// Excludes
test(SRL, 'EXCL: release notes', 'generate release notes', null, false);
test(SRL, 'EXCL: npm release', 'npm release command', null, false);

// ═══════════════════════════════════════════════════
// 12. IDEA-TO-PBI (priority 8)
// ═══════════════════════════════════════════════════
const SIP = 'idea-to-pbi';
test(SIP, 'EN: new idea', 'new idea for user dashboard', 'idea-to-pbi');
test(SIP, 'EN: feature request', 'feature request for dark mode', 'idea-to-pbi');
test(SIP, 'EN: add to backlog', 'add to backlog', 'idea-to-pbi');
test(SIP, 'EN: capture idea', 'capture this idea', 'idea-to-pbi');
test(SIP, 'EN: product idea', 'product idea for notifications', 'idea-to-pbi');
test(SIP, 'EN: idea about error tracking', 'new idea about error tracking feature', 'idea-to-pbi');
test(SIP, 'EN: idea file path', 'team-artifacts/ideas/dark-mode.md', 'idea-to-pbi');
test(SIP, 'VI: ý tưởng mới', 'ý tưởng mới cho trang chủ', 'idea-to-pbi');
test(SIP, 'ZH: 新想法', '新想法关于搜索', 'idea-to-pbi');
test(SIP, 'JA: 新しいアイデア', '新しいアイデアがあります', 'idea-to-pbi');
test(SIP, 'KO: 새 아이디어', '새 아이디어 있어요', 'idea-to-pbi');
// Excludes
test(SIP, 'EXCL: fix bug', 'fix the bug in backlog', 'bugfix');

// ═══════════════════════════════════════════════════
// 14. SPRINT-PLANNING (priority 17)
// ═══════════════════════════════════════════════════
const SSP = 'sprint-planning';
test(SSP, 'EN: sprint planning', 'sprint planning session', 'sprint-planning');
test(SSP, 'EN: plan the sprint', 'plan the sprint', 'sprint-planning');
test(SSP, 'EN: backlog grooming', 'backlog grooming meeting', 'sprint-planning');
test(SSP, 'EN: sprint kickoff', 'sprint kickoff today', 'sprint-planning');
test(SSP, 'VI: chuẩn bị sprint', 'chuẩn bị sprint mới', 'sprint-planning');
test(SSP, 'ZH: sprint规划', 'sprint规划会议', 'sprint-planning');
test(SSP, 'JA: スプリント計画', 'スプリント計画を立てる', 'sprint-planning');
test(SSP, 'KO: 스프린트 계획', '스프린트 계획 세우기', 'sprint-planning');
// Excludes
test(SSP, 'EXCL: sprint review (no match, team-meeting removed)', 'sprint review meeting', null, false);
test(SSP, 'EXCL: sprint status → pm-reporting', 'sprint status report', 'pm-reporting');

// ═══════════════════════════════════════════════════
// 15. PBI-TO-TESTS (priority 22)
// ═══════════════════════════════════════════════════
const SPT = 'pbi-to-tests';
test(SPT, 'EN: create tests for', 'create tests for login', 'pbi-to-tests');
test(SPT, 'EN: test this PBI', 'test this pbi', 'pbi-to-tests');
test(SPT, 'EN: qa this', 'qa this feature', 'pbi-to-tests');
test(SPT, 'EN: generate test cases', 'generate test cases', 'pbi-to-tests');
test(SPT, 'EN: test spec for', 'test spec for the auth module', 'pbi-to-tests');
test(SPT, 'EN: write test cases for', 'write test cases for checkout', 'pbi-to-tests');
test(SPT, 'EN: PBI file path', 'team-artifacts/pbis/auth-login.md', 'pbi-to-tests');
test(SPT, 'VI: tạo test cho', 'tạo test cho module đăng nhập', 'pbi-to-tests');
test(SPT, 'ZH: 创建测试用例', '创建测试用例', 'pbi-to-tests');
test(SPT, 'JA: テストケース作成', 'テストケース作成', 'pbi-to-tests');
test(SPT, 'KO: 테스트 케이스 생성', '테스트 케이스 생성', 'pbi-to-tests');
// Excludes
test(SPT, 'EXCL: run tests (no match, testing removed)', 'run tests', null, false);

// ═══════════════════════════════════════════════════
// 16. DESIGN-WORKFLOW (priority 28)
// ═══════════════════════════════════════════════════
const SDW = 'design-workflow';
test(SDW, 'EN: design this feature', 'design this feature', 'design-workflow');
test(SDW, 'EN: design the page', 'design the settings page', 'design-workflow');
test(SDW, 'EN: ui spec', 'create a ui spec', 'design-workflow');
test(SDW, 'EN: mockup for', 'mockup for dashboard', 'design-workflow');
test(SDW, 'EN: wireframe of', 'wireframe of login page', 'design-workflow');
test(SDW, 'EN: design spec for', 'design spec for auth module', 'design-workflow');
test(SDW, 'VI: thiết kế cho', 'thiết kế cho trang đăng nhập', 'design-workflow');
test(SDW, 'ZH: 设计', 'UI规范设计', 'design-workflow');
test(SDW, 'JA: デザイン', 'デザインを作成', 'design-workflow');
test(SDW, 'KO: 디자인', '디자인 사양 만들기', 'design-workflow');
// Excludes
test(SDW, 'EXCL: implement design (→ feature)', 'implement the design', 'feature');
test(SDW, 'EXCL: code the design', 'code the design', null, false);

// ═══════════════════════════════════════════════════
// 18. PM-REPORTING (priority 45)
// ═══════════════════════════════════════════════════
const SPM = 'pm-reporting';
test(SPM, 'EN: status report', 'status report for sprint 5', 'pm-reporting');
test(SPM, 'EN: sprint update', 'sprint update please', 'pm-reporting');
test(SPM, 'EN: project report', 'project report needed', 'pm-reporting');
test(SPM, 'EN: progress report', 'progress report', 'pm-reporting');
test(SPM, 'EN: full status report', 'full status report', 'pm-reporting');
test(SPM, 'EN: blocker analysis', 'blocker analysis for the team', 'pm-reporting');
test(SPM, 'VI: báo cáo sprint', 'báo cáo sprint hiện tại', 'pm-reporting');
test(SPM, 'ZH: 状态报告', '状态报告', 'pm-reporting');
test(SPM, 'JA: ステータスレポート', 'ステータスレポート', 'pm-reporting');
test(SPM, 'KO: 상태 보고서', '상태 보고서', 'pm-reporting');
// Excludes
test(SPM, 'EXCL: just status (no match, status-only removed)', 'just the status', null, false);
test(SPM, 'EXCL: quick status (no match, status-only removed)', 'quick status', null, false);

// ═══════════════════════════════════════════════════
// OVERRIDE / SKIP MECHANISMS
// ═══════════════════════════════════════════════════
const SOV = 'override';
test(SOV, 'quick: prefix skips detection', 'quick: fix this bug', null, false);
test(SOV, 'slash command skips detection', '/plan the feature', null, false);
test(SOV, 'slash with args', '/cook:auto implement dark mode', null, false);
test(SOV, 'slash fix', '/fix the login issue', null, false);

// ═══════════════════════════════════════════════════
// NEW: BATCH-OPERATION (priority 13)
// ═══════════════════════════════════════════════════
const SBO = 'batch-operation';
test(SBO, 'EN: all files', 'update all files in the module', 'batch-operation');
test(SBO, 'EN: multiple components', 'rename multiple components', 'batch-operation');
test(SBO, 'EN: across codebase', 'change API endpoint across codebase', 'batch-operation');
test(SBO, 'EN: find and replace', 'find and replace validateUser with checkUser', 'batch-operation');
test(SBO, 'EN: batch update', 'batch update imports', 'batch-operation');
test(SBO, 'EN: everywhere', 'rename AuthService everywhere', 'batch-operation');
test(SBO, 'EN: several modules', 'update several modules', 'batch-operation');
test(SBO, 'EN: throughout project', 'fix typo throughout the project', 'batch-operation');
test(SBO, 'EN: many files', 'update copyright in many files', 'batch-operation');
test(SBO, 'VI: tất cả file', 'cập nhật tất cả file trong dự án', 'batch-operation');
test(SBO, 'VI: nhiều thành phần', 'thay đổi nhiều thành phần', 'batch-operation');
test(SBO, 'ZH: 所有文件', '更新所有文件', 'batch-operation');
test(SBO, 'ZH: 批量修改', '批量修改配置', 'batch-operation');
test(SBO, 'JA: 全てのファイル', '全てのファイルを更新', 'batch-operation');
test(SBO, 'JA: 複数のコンポーネント', '複数のコンポーネントを変更', 'batch-operation');
test(SBO, 'KO: 모든 파일', '모든 파일 업데이트', 'batch-operation');
test(SBO, 'KO: 여러 컴포넌트', '여러 컴포넌트 변경', 'batch-operation');
// Excludes
test(SBO, 'EXCL: test file', 'update test file', null, false);
test(SBO, 'EXCL: document all', 'document all features', 'documentation');
// Note: "add logging to each component" matches feature more strongly than batch
// due to "add" keyword giving +10 to feature priority. This is expected behavior.

// ═══════════════════════════════════════════════════
// NEW: BUSINESS-FEATURE-DOCS (priority 26)
// ═══════════════════════════════════════════════════
const SBFD = 'business-feature-docs';
test(SBFD, 'EN: feature doc', 'create feature doc for payments', 'business-feature-docs');
test(SBFD, 'EN: business feature', 'document business feature', 'business-feature-docs');
test(SBFD, 'EN: module doc', 'module doc for authentication', 'business-feature-docs');
test(SBFD, 'EN: update feature doc', 'update feature doc', 'business-feature-docs');
test(SBFD, 'EN: path reference', 'docs/business-features/payments/README.md', 'business-feature-docs');
test(SBFD, 'VI: tài liệu tính năng', 'tài liệu tính năng thanh toán', 'business-feature-docs');
test(SBFD, 'ZH: 功能文档', '功能文档编写', 'business-feature-docs');
test(SBFD, 'JA: 機能ドキュメント', '機能ドキュメント作成', 'business-feature-docs');
test(SBFD, 'KO: 기능 문서', '기능 문서 작성', 'business-feature-docs');

// ═══════════════════════════════════════════════════
// NEW: MIGRATION (priority 23)
// ═══════════════════════════════════════════════════
const SMG = 'migration';
// Note: "create" and "add" also trigger feature (priority 10 < migration 23), so feature wins for those prompts
test(SMG, 'EN: create migration (→ feature by priority)', 'create a migration for users table', 'feature');
test(SMG, 'EN: migrate to new schema', 'migrate to the new schema', 'migration');
test(SMG, 'EN: schema change', 'schema change for orders table', 'migration');
test(SMG, 'EN: add column (→ feature by priority)', 'add column to users table', 'feature');
test(SMG, 'EN: database migration', 'database migration for orders', 'migration');
test(SMG, 'EN: data migration', 'data migration needed', 'migration');
test(SMG, 'EN: ef migration', 'ef migration for new entity', 'migration');
test(SMG, 'EN: database change', 'database change for the schema', 'migration');
test(SMG, 'EN: alter index', 'alter index on products', 'migration');
test(SMG, 'EN: schema update', 'schema update for users table', 'migration');
test(SMG, 'VI: tạo migration (→ feature by priority)', 'tạo migration cho bảng users', 'feature');
test(SMG, 'VI: thay đổi schema', 'thay đổi schema cơ sở dữ liệu', 'migration');
test(SMG, 'ZH: 创建迁移', '创建数据迁移', 'migration');
test(SMG, 'ZH: 数据库变更', '数据库模式变更', 'migration');
// Note: No JA/KO trigger patterns for migration in config
test(SMG, 'JA: マイグレーション (no JA pattern)', 'マイグレーションを作成', null, false);
test(SMG, 'KO: 마이그레이션 (no KO pattern)', '마이그레이션을 생성', null, false);
// Excludes — both investigation and migration exclude this prompt (dead zone)
test(SMG, 'EXCL: how migration works (dead zone)', 'how does migration work', null, false);
test(SMG, 'EXCL: migration status (no match)', 'migration status check', null, false);

// ═══════════════════════════════════════════════════
// NEW: PERFORMANCE (priority 42)
// ═══════════════════════════════════════════════════
const SPF = 'performance';
test(SPF, 'EN: performance of API', 'performance of the API is poor', 'performance');
test(SPF, 'EN: optimize the query', 'optimize the database query', 'performance');
test(SPF, 'EN: slow response', 'slow response from server', 'performance');
// Note: "issue" triggers bugfix (priority 20 < performance 42), so bugfix wins
test(SPF, 'EN: latency issue (→ bugfix by priority)', 'latency issue in production', 'bugfix');
test(SPF, 'EN: bottleneck detected', 'bottleneck in the rendering pipeline', 'performance');
test(SPF, 'EN: throughput problem', 'throughput is below threshold', 'performance');
test(SPF, 'EN: n+1 query', 'n+1 query problem in orders', 'performance');
test(SPF, 'EN: query optimization', 'query optimization needed', 'performance');
// Note: "build" triggers feature (priority 10 < performance 42), so feature wins
test(SPF, 'EN: speed up build (→ feature by priority)', 'speed up the build process', 'feature');
test(SPF, 'EN: speed up rendering', 'speed up the rendering', 'performance');
test(SPF, 'EN: memory optimization', 'memory optimization required', 'performance');
test(SPF, 'VI: tối ưu hiệu suất', 'tối ưu hiệu suất API', 'performance');
test(SPF, 'VI: chậm', 'trang web chậm quá', 'performance');
test(SPF, 'ZH: 优化性能', '优化性能表现', 'performance');
test(SPF, 'ZH: 慢', '响应太慢了', 'performance');
test(SPF, 'JA: パフォーマンス改善', 'パフォーマンス改善したい', 'performance');
test(SPF, 'JA: 遅い', 'レスポンスが遅い', 'performance');
test(SPF, 'KO: 성능 개선', '성능 개선이 필요합니다', 'performance');
test(SPF, 'KO: 느린', '응답이 느린 문제', 'performance');
// Excludes — dead zone: investigation excludes general terms, performance excludes "explain...performance"
test(SPF, 'EXCL: explain performance (dead zone)', 'explain the performance bottleneck', null, false);

// ═══════════════════════════════════════════════════
// NEW: SECURITY-AUDIT (priority 40)
// ═══════════════════════════════════════════════════
const SSA = 'security-audit';
test(SSA, 'EN: security audit', 'security audit of the auth module', 'security-audit');
test(SSA, 'EN: security review', 'security review needed', 'security-audit');
test(SSA, 'EN: security check', 'security check on the API', 'security-audit');
test(SSA, 'EN: vulnerability scan', 'vulnerability scan of the app', 'security-audit');
test(SSA, 'EN: owasp check', 'owasp check for the web app', 'security-audit');
test(SSA, 'EN: audit for security', 'audit for security issues', 'security-audit');
test(SSA, 'EN: penetration test', 'penetration test the API', 'security-audit');
test(SSA, 'EN: security assessment', 'security assessment needed', 'security-audit');
test(SSA, 'EN: vulnerabilities review', 'vulnerabilities review of the system', 'security-audit');
test(SSA, 'VI: kiểm tra bảo mật', 'kiểm tra bảo mật cho ứng dụng', 'security-audit');
test(SSA, 'VI: đánh giá bảo mật', 'đánh giá bảo mật hệ thống', 'security-audit');
test(SSA, 'ZH: 安全审计', '安全审计代码', 'security-audit');
test(SSA, 'ZH: 漏洞扫描', '漏洞扫描系统', 'security-audit');
test(SSA, 'JA: セキュリティ監査', 'セキュリティ監査をお願いします', 'security-audit');
test(SSA, 'JA: 脆弱性チェック', '脆弱性チェックが必要です', 'security-audit');
test(SSA, 'KO: 보안 감사', '보안 감사 해주세요', 'security-audit');
test(SSA, 'KO: 취약점 스캔', '취약점 스캔 필요합니다', 'security-audit');
// Excludes
test(SSA, 'EXCL: implement security (→ feature)', 'implement security for the API', 'feature');
test(SSA, 'EXCL: fix security (→ bugfix)', 'fix the security vulnerability', 'bugfix');
test(SSA, 'EXCL: add auth (→ feature)', 'add security headers', 'feature');

// ═══════════════════════════════════════════════════
// NEW: DEPLOYMENT (priority 44)
// ═══════════════════════════════════════════════════
const SDP = 'deployment';
test(SDP, 'EN: deploy to staging', 'deploy to the staging environment', 'deployment');
test(SDP, 'EN: deployment for production', 'deployment for production release', 'deployment');
test(SDP, 'EN: ci/cd pipeline setup', 'ci/cd pipeline setup needed', 'deployment');
test(SDP, 'EN: pipeline config', 'pipeline config update required', 'deployment');
test(SDP, 'EN: dockerfile setup', 'dockerfile setup for new service', 'deployment');
test(SDP, 'EN: docker compose update', 'docker compose update needed', 'deployment');
test(SDP, 'EN: setup the pipeline', 'setup the pipeline for the project', 'deployment');
test(SDP, 'EN: infrastructure setup', 'infrastructure setup for microservice', 'deployment');
test(SDP, 'VI: triển khai lên staging', 'triển khai lên staging server', 'deployment');
test(SDP, 'VI: cấu hình pipeline', 'cấu hình pipeline CI/CD', 'deployment');
test(SDP, 'ZH: 部署到服务器', '部署到生产服务器', 'deployment');
test(SDP, 'ZH: CI/CD配置', 'CI/CD流水线配置更新', 'deployment');
test(SDP, 'JA: デプロイ設定', 'デプロイメント設定を更新', 'deployment');
test(SDP, 'JA: パイプライン構成', 'パイプライン構成を更新する', 'deployment');
test(SDP, 'KO: 배포 설정', '배포 설정 업데이트', 'deployment');
test(SDP, 'KO: 파이프라인 구성', '파이프라인 구성 변경', 'deployment');
// Excludes
test(SDP, 'EXCL: explain deploy (→ investigation)', 'how does deployment work', 'investigation');
test(SDP, 'EXCL: deploy status (no match)', 'deployment status check', null, false);

// ═══════════════════════════════════════════════════
// NEW: VERIFICATION (priority 18)
// ═══════════════════════════════════════════════════
const SVF = 'verification';
test(SVF, 'EN: verify the fix', 'verify the fix is working', 'verification');
test(SVF, 'EN: validate the changes', 'validate the changes made', 'verification');
test(SVF, 'EN: check that login works', 'check that login works correctly', 'verification');
test(SVF, 'EN: confirm that API', 'confirm that the API returns 200', 'verification');
test(SVF, 'EN: make sure', 'make sure everything is working', 'verification');
test(SVF, 'EN: ensure that tests', 'ensure that the tests pass', 'verification');
test(SVF, 'EN: is this working', 'is this working correctly', 'verification');
test(SVF, 'EN: does it work', 'does it still work after the change', 'verification');
test(SVF, 'VI: xác minh rằng', 'xác minh rằng chức năng hoạt động', 'verification');
test(SVF, 'VI: kiểm tra xem', 'kiểm tra xem API có hoạt động', 'verification');
test(SVF, 'VI: đảm bảo rằng', 'đảm bảo rằng nó đúng', 'verification');
test(SVF, 'ZH: 验证是否正确', '验证是否正确运行', 'verification');
test(SVF, 'ZH: 确保正常', '确保功能正常工作', 'verification');
test(SVF, 'JA: 検証正しい', '検証が正しいか確認', 'verification');
test(SVF, 'JA: 確認動く', '確認して動くかどうか', 'verification');
test(SVF, 'KO: 검증 올바른', '검증이 올바른지 확인', 'verification');
test(SVF, 'KO: 확인 작동', '확인해주세요 작동되는지', 'verification');
// Excludes
test(SVF, 'EXCL: implement new (→ feature)', 'implement new validation logic', 'feature');
test(SVF, 'EXCL: review code (→ review)', 'review code changes', 'review');
test(SVF, 'EXCL: docs (→ documentation)', 'verify the documentation', 'documentation');
test(SVF, 'EXCL: quality audit (→ quality-audit)', 'ensure quality of the module', 'quality-audit');

// ═══════════════════════════════════════════════════
// CROSS-WORKFLOW CONFLICT BOUNDARIES
// ═══════════════════════════════════════════════════
const SCW = 'cross-workflow';
// bugfix ↔ refactor
test(SCW, 'fix bug (not refactor)', 'fix the crash bug', 'bugfix');
test(SCW, 'improve code (not bugfix)', 'improve the error handling code', 'refactor');
// bugfix ↔ investigation
test(SCW, 'how error works (not bugfix)', 'how does error handling work', 'investigation');
test(SCW, 'error occurred (not investigation)', 'error occurred in production', 'bugfix');
// feature ↔ pre-development
test(SCW, 'start new feature (pre-dev)', 'start a new feature', 'pre-development');
test(SCW, 'implement feature (feature)', 'implement a search feature', 'feature');
// feature ↔ testing
test(SCW, 'add tests (no match, testing removed)', 'add tests for the module', null, false);
test(SCW, 'add button (feature, not testing)', 'add a new button to the header', 'feature');
// feature ↔ documentation
test(SCW, 'add docs (documentation, not feature)', 'add documentation for the API', 'documentation');
test(SCW, 'add module (feature, not docs)', 'add a notification module', 'feature');
// feature ↔ batch-operation
test(SCW, 'add to one file (feature)', 'add logging to UserService', 'feature');
test(SCW, 'update all files (batch)', 'update imports in all files', 'batch-operation');
// Note: "add to all" still prefers feature due to "add" keyword strength
// status-only ↔ pm-reporting
test(SCW, 'quick status (no match, status-only removed)', 'quick status please', null, false);
test(SCW, 'status report (pm-reporting)', 'weekly status report', 'pm-reporting');
// sprint-planning ↔ team-meeting
test(SCW, 'sprint planning (not meeting)', 'start sprint planning', 'sprint-planning');
test(SCW, 'team standup (no match, team-meeting removed)', 'team standup meeting', null, false);
test(SCW, 'sprint retro (no match, team-meeting removed)', 'sprint retrospective', null, false);
// idea-to-pbi ↔ idea-only
test(SCW, 'capture idea (→ idea-to-pbi by priority)', 'capture this idea for notifications', 'idea-to-pbi');
test(SCW, 'just the idea (no match, idea-only removed)', 'just the idea', null, false);
test(SCW, 'quick idea (no match, idea-only removed)', 'quick idea about caching', null, false);
// pbi-to-tests ↔ testing
test(SCW, 'run tests (no match, testing removed)', 'run tests for auth', null, false);
test(SCW, 'generate test cases (pbi-to-tests)', 'generate test cases from PBI', 'pbi-to-tests');
test(SCW, 'write tests for feature (→ pbi-to-tests)', 'write tests for login feature', 'pbi-to-tests');
// design-workflow ↔ design-spec-only
test(SCW, 'design feature (design-workflow)', 'design the login page', 'design-workflow');
test(SCW, 'just design spec (no match, design-spec-only removed)', 'just the design spec', null, false);
// figma-detection ↔ figma-extract-only
test(SCW, 'figma URL (no match, figma-detection removed)', 'figma.com/design/xyz/Page', null, false);
test(SCW, 'just extract figma (no match, figma-extract-only removed)', 'just extract figma tokens', null, false);
test(SCW, 'get figma colors (no match, figma-extract-only removed)', 'get figma colors', null, false);
// release-prep vs quality-gate-only
test(SCW, 'prepare release (release-prep)', 'prepare for release', 'release-prep');
test(SCW, 'just quality gate (no match, quality-gate-only removed)', 'just the quality gate', null, false);
test(SCW, 'ready to ship (release-prep)', 'ready to ship v2.0', 'release-prep');
// review ↔ quality-audit
test(SCW, 'review code (review, no quality keywords)', 'review the code', 'review');
test(SCW, 'review code best practices (quality-audit)', 'review code for best practices', 'quality-audit');
test(SCW, 'quality audit (quality-audit)', 'quality audit the module', 'quality-audit');
test(SCW, 'check code quality (review, no audit keywords)', 'check code quality', 'review');
test(SCW, 'ensure quality (quality-audit)', 'ensure quality of the API', 'quality-audit');
// review ↔ review-changes
test(SCW, 'review my changes (→ review, review-changes removed)', 'review my changes before commit', 'review');
test(SCW, 'review pr (review)', 'review pr #123', 'review');
// refine-only ↔ story-only
test(SCW, 'create pbi (no match, refine-only removed)', 'create pbi', null, false);
test(SCW, 'create stories (no match, story-only removed)', 'create user stories', null, false);
test(SCW, 'just pbi (no match, refine-only removed)', 'just the pbi', null, false);
test(SCW, 'just stories (no match, story-only removed)', 'just the stories', null, false);

// ═══════════════════════════════════════════════════
// EDGE CASES — Unicode, plurals, intervening words
// ═══════════════════════════════════════════════════
const SE = 'edge-cases';
test(SE, 'add a test (no match, testing removed)', 'add a test for login', null, false);
test(SE, 'create new test file (no match, testing removed)', 'create new test file', null, false);
test(SE, 'add some tests (no match, testing removed)', 'add some tests for checkout', null, false);
test(SE, 'add error handling (feature)', 'add error handling', 'feature');
test(SE, 'implement error handling feature', 'implement error handling feature', 'feature');
test(SE, 'write test documentation (docs)', 'write test documentation', 'documentation');
test(SE, 'document test API (docs)', 'document the test API', 'documentation');
test(SE, 'JA: テスト作成 (noun-first → pbi-to-tests)', 'テスト作成', 'pbi-to-tests');
test(SE, 'KO: 테스트 작성 (noun-first → pbi-to-tests)', '테스트 작성', 'pbi-to-tests');
test(SE, 'empty prompt (no match)', '', null, false);
test(SE, 'random text (no match)', 'hello world how is the weather', null, false);
test(SE, 'mixed: refactor and add tests (refactor wins)', 'refactor code and add tests', 'refactor');

// ═══════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════
console.log('══════════════════════════════════════════════════');
if (failures.length > 0) {
    console.log(`\n  FAILURES (${failures.length}):\n`);
    for (const f of failures) {
        console.log(`  [${f.section}] ${f.desc}`);
        console.log(`    Prompt:    "${f.prompt}"`);
        console.log(`    Expected:  ${f.expected}`);
        console.log(`    Got:       ${f.got}`);
        if (f.alts && f.alts.length > 0) {
            console.log(`    Alts:      ${f.alts.join(', ')}`);
        }
        console.log();
    }
}
console.log(`  RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('══════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
