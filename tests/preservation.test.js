const { translateWithPreservation } = require('../utils/preservation');

describe('Translation Preservation Logic', () => {
    test('Should not process single words', async () => {
        const translateFn = jest.fn().mockResolvedValue({
            source: 'test',
            data: { translation: '控制台' }
        });
        const result = await translateWithPreservation('console', translateFn);
        
        expect(translateFn).toHaveBeenCalledWith('console');
        expect(result.data.translation).toBe('控制台');
    });

    test('Should preserve inline backticks code', async () => {
        const translateFn = jest.fn().mockImplementation(async (text) => {
            // Simulated translation where it translates words but leaves [__CODE_X__] placeholders untouched
            return {
                source: 'test',
                data: { translation: '请使用 [__CODE_0__] 来执行它。' }
            };
        });

        const result = await translateWithPreservation('Please use `const x = 10;` to run it.', translateFn);
        
        expect(translateFn).toHaveBeenCalledWith('Please use [__CODE_0__] to run it.');
        expect(result.data.translation).toBe('请使用 `const x = 10;` 来执行它。');
    });

    test('Should preserve HTML tags', async () => {
        const translateFn = jest.fn().mockImplementation(async (text) => {
            return {
                source: 'test',
                data: { translation: '点击这个 [__CODE_0__]链接[__CODE_1__]去跳转。' }
            };
        });

        const result = await translateWithPreservation('Click this <a>link</a> to go.', translateFn);
        expect(result.data.translation).toBe('点击这个 <a>链接</a>去跳转。');
    });

    test('Should preserve camelCase and snake_case variable names', async () => {
        const translateFn = jest.fn().mockImplementation(async (text) => {
            return {
                source: 'test',
                data: { translation: '设置 [__CODE_0__] 和 [__CODE_1__] 的值。' }
            };
        });

        const result = await translateWithPreservation('Set the value of myVarName and user_session_id.', translateFn);
        expect(result.data.translation).toBe('设置 myVarName 和 user_session_id 的值。');
    });

    test('Should preserve function calls and comments in correct order', async () => {
        const translateFn = jest.fn().mockImplementation(async (text) => {
            return {
                source: 'test',
                data: { translation: '调用 [__CODE_0__] 并加上注释 [__CODE_1__]' }
            };
        });

        const result = await translateWithPreservation('Call performTask(data) with comment // debug here', translateFn);
        
        expect(translateFn).toHaveBeenCalledWith('Call [__CODE_0__] with comment [__CODE_1__]');
        expect(result.data.translation).toBe('调用 performTask(data) 并加上注释 // debug here');
    });

    test('Should preserve Chinese characters inside mixed sentences', async () => {
        const translateFn = jest.fn().mockImplementation(async (text) => {
            return {
                source: 'test',
                data: { translation: '英文 [__CODE_0__] 意思是 确认。' }
            };
        });

        const result = await translateWithPreservation('The Chinese word 确认按钮 means confirm.', translateFn);
        
        expect(translateFn).toHaveBeenCalledWith('The Chinese word [__CODE_0__] means confirm.');
        expect(result.data.translation).toBe('英文 确认按钮 意思是 确认。');
    });

    test('Should correct domain-specific translation errors (Auto-Pop and memory cards)', async () => {
        const translateFn1 = jest.fn().mockImplementation(async (text) => {
            // text will be "Ebbinghaus [__CODE_0__]"
            return {
                source: 'test',
                data: { translation: '艾宾浩斯 [__CODE_0__]' }
            };
        });
        const result1 = await translateWithPreservation('Ebbinghaus Auto-Pop', translateFn1);
        expect(translateFn1).toHaveBeenCalledWith('Ebbinghaus [__CODE_0__]');
        expect(result1.data.translation).toBe('艾宾浩斯 自动弹出');

        const translateFn2 = jest.fn().mockImplementation(async (text) => {
            // text will be "Silently interrupt with Ebbinghaus [__CODE_0__] when due"
            return {
                source: 'test',
                data: { translation: '到期时用艾宾浩斯 [__CODE_0__] 默默打断' }
            };
        });
        const result2 = await translateWithPreservation('Silently interrupt with Ebbinghaus memory cards when due', translateFn2);
        expect(translateFn2).toHaveBeenCalledWith('Silently interrupt with Ebbinghaus [__CODE_0__] when due');
        expect(result2.data.translation).toBe('到期时用艾宾浩斯 记忆卡 默默打断');
    });
});
