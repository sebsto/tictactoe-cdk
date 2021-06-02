import * as cdk from 'aws-cdk-lib';
import * as TictactoeCdk from '../lib/tictactoe-cdk-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new TictactoeCdk.TictactoeCdkStack(app, 'MyTestStack');
    // THEN
    const actual = app.synth().getStackArtifact(stack.artifactId).template;
    expect(actual.Resources ?? {}).toEqual({});
});
