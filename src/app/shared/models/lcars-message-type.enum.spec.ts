import { MessageType } from './lcars-message-type.enum';

describe('MessageType enum', () => {
  it('should be defined', () => {
    expect(MessageType).toBeDefined();
  });

  it('should expose the expected values for each message type', () => {
    expect(MessageType.Info).toBe('info');
    expect(MessageType.Success).toBe('success');
    expect(MessageType.Error).toBe('error');
  });

  it('should only contain the defined message type values', () => {
    const values = Object.values(MessageType).sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
    expect(values).toEqual(['error', 'info', 'success']);
  });
});
