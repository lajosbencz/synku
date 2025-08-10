import { TypeScriptGenerator } from '../src/helm/generator';

describe('TypeScriptGenerator', () => {
  let generator: TypeScriptGenerator;

  beforeEach(() => {
    generator = new TypeScriptGenerator();
  });

  describe('formatPropertyName', () => {
    it('should not quote valid JavaScript identifiers', () => {
      const method = (generator as any).formatPropertyName.bind(generator);

      expect(method('validName')).toBe('validName');
      expect(method('validName123')).toBe('validName123');
      expect(method('_validName')).toBe('_validName');
      expect(method('$validName')).toBe('$validName');
      expect(method('validName_123')).toBe('validName_123');
    });

    it('should quote property names with special characters', () => {
      const method = (generator as any).formatPropertyName.bind(generator);

      expect(method('prometheus.io/scrape')).toBe('"prometheus.io/scrape"');
      expect(method('prometheus.io/port')).toBe('"prometheus.io/port"');
      expect(method('prometheus.io/path')).toBe('"prometheus.io/path"');
      expect(method('app.kubernetes.io/name')).toBe('"app.kubernetes.io/name"');
      expect(method('config-map')).toBe('"config-map"');
      expect(method('123invalid')).toBe('"123invalid"');
      expect(method('invalid-name')).toBe('"invalid-name"');
      expect(method('invalid.name')).toBe('"invalid.name"');
      expect(method('invalid/name')).toBe('"invalid/name"');
      expect(method('invalid name')).toBe('"invalid name"');
    });

    it('should escape quotes in property names', () => {
      const method = (generator as any).formatPropertyName.bind(generator);

      expect(method('property"with"quotes')).toBe('"property\\"with\\"quotes"');
      expect(method('"quotedProperty"')).toBe('"\\"quotedProperty\\""');
    });
  });

  describe('generateTypeString', () => {
    it('should generate proper TypeScript for objects with special property names', () => {
      const method = (generator as any).generateTypeString.bind(generator);

      const schema = {
        type: 'object',
        properties: {
          'normalProperty': { type: 'string' },
          'prometheus.io/scrape': { type: 'string' },
          'app.kubernetes.io/name': { type: 'string' },
          'config-map': { type: 'boolean' },
        },
      };

      const result = method(schema);

      expect(result).toContain('normalProperty?: string;');
      expect(result).toContain('"prometheus.io/scrape"?: string;');
      expect(result).toContain('"app.kubernetes.io/name"?: string;');
      expect(result).toContain('"config-map"?: boolean;');
    });
  });
});
