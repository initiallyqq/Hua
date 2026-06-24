import 'model_config.dart';

class ProviderConfig {
  const ProviderConfig({
    required this.id,
    required this.enabled,
    required this.name,
    required this.protocol,
    required this.apiKey,
    required this.baseUrl,
    required this.apiPath,
    required this.models,
  });

  final String id;
  final bool enabled;
  final String name;
  final String protocol;
  final String apiKey;
  final String baseUrl;
  final String apiPath;
  final List<ModelConfig> models;

  factory ProviderConfig.fromJson(Map<String, Object?> json) {
    final protocol = json['protocol']?.toString() ?? 'openaiCompatible';
    final name = json['name']?.toString() ?? 'OpenAI';
    return ProviderConfig(
      id: json['id']?.toString() ?? _makeId(name),
      enabled: json['enabled'] as bool? ?? true,
      name: name,
      protocol: protocol,
      apiKey: json['apiKey']?.toString() ?? '',
      baseUrl: json['baseUrl']?.toString() ?? _defaultBaseUrl(protocol),
      apiPath: json['apiPath']?.toString() ?? _defaultApiPath(protocol),
      models: _readModels(json['models']),
    );
  }

  factory ProviderConfig.template(String template) {
    final normalized = template.toLowerCase();
    if (normalized == 'google' || normalized == 'gemini') {
      return ProviderConfig(
        id: _makeId('Google'),
        enabled: true,
        name: 'Google',
        protocol: 'gemini',
        apiKey: '',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiPath: '',
        models: const [
          ModelConfig(
            modelId: 'gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
          ),
        ],
      );
    }
    if (normalized == 'claude') {
      return ProviderConfig(
        id: _makeId('Claude'),
        enabled: true,
        name: 'Claude',
        protocol: 'claude',
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        apiPath: '/v1/messages',
        models: const [
          ModelConfig(
            modelId: 'claude-sonnet-4',
            displayName: 'Claude Sonnet 4',
          ),
        ],
      );
    }
    return ProviderConfig(
      id: _makeId('OpenAI'),
      enabled: true,
      name: 'OpenAI',
      protocol: 'openaiCompatible',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      apiPath: '/chat/completions',
      models: const [
        ModelConfig(modelId: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini'),
      ],
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'enabled': enabled,
      'name': name,
      'protocol': protocol,
      'apiKey': apiKey,
      'baseUrl': baseUrl,
      'apiPath': apiPath,
      'models': models.map((model) => model.toJson()).toList(),
    };
  }

  ProviderConfig copyWith({
    String? id,
    bool? enabled,
    String? name,
    String? protocol,
    String? apiKey,
    String? baseUrl,
    String? apiPath,
    List<ModelConfig>? models,
  }) {
    return ProviderConfig(
      id: id ?? this.id,
      enabled: enabled ?? this.enabled,
      name: name ?? this.name,
      protocol: protocol ?? this.protocol,
      apiKey: apiKey ?? this.apiKey,
      baseUrl: baseUrl ?? this.baseUrl,
      apiPath: apiPath ?? this.apiPath,
      models: models ?? this.models,
    );
  }

  static List<ModelConfig> _readModels(Object? value) {
    if (value is! List) {
      return [];
    }
    return value
        .whereType<Map>()
        .map(
          (entry) => entry.map((key, value) => MapEntry(key.toString(), value)),
        )
        .map(ModelConfig.fromJson)
        .where((model) => model.modelId.isNotEmpty)
        .toList();
  }

  static String _makeId(String name) {
    return '${name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}-${DateTime.now().microsecondsSinceEpoch}';
  }

  static String _defaultBaseUrl(String protocol) {
    return switch (protocol) {
      'gemini' => 'https://generativelanguage.googleapis.com',
      'claude' => 'https://api.anthropic.com',
      _ => 'https://api.openai.com/v1',
    };
  }

  static String _defaultApiPath(String protocol) {
    return switch (protocol) {
      'claude' => '/v1/messages',
      'gemini' => '',
      _ => '/chat/completions',
    };
  }
}
