import { BytesToSizePipe } from './byte-to-size.pipe';

describe('BytesToSizePipe', () => {
  it('create an instance', () => {
    const pipe = new BytesToSizePipe();
    expect(pipe).toBeTruthy();
  });
});
