package com.cymops.service;

import com.cymops.dto.IncidentTimelineDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiService {

    private final TimelineService timelineService;
    private final EngineeringReportService engineeringReportService;
    private final RoomService roomService;

    @Value("${ai.api.key:}")
    private String apiKey;

    @Value("${ai.api.base-url:https://api.openai.com/v1/chat/completions}")
    private String aiBaseUrl;

    @Value("${ai.api.model:gemini-2.5-flash}")
    private String aiModel;

    @Value("${ai.api.provider:gemini}")
    private String aiProvider;

    @Value("${ai.api.connect-timeout-ms:3000}")
    private int aiConnectTimeoutMs;

    @Value("${ai.api.read-timeout-ms:30000}")
    private int aiReadTimeoutMs;

    @Value("${ai.insights.cache-minutes:10}")
    private long insightsCacheMinutes;

    private final AtomicReference<String> engineeringInsightsCache = new AtomicReference<>();
    private final AtomicReference<Instant> engineeringInsightsCacheAt = new AtomicReference<>();

    public String generateSummary(Long roomId, String callerEmail) {
        // Check room access
        roomService.getRoomById(roomId, callerEmail);
        
        List<IncidentTimelineDto> events = timelineService.getTimelineByRoomId(roomId);
        String context = events.stream()
                .map(e -> "[" + e.getCreatedAt() + "] " + e.getEventType() + ": " + e.getContent())
                .collect(Collectors.joining("\n"));

        String prompt = "You are CYAI, the built-in AI assistant of CyMOPS (an incident management platform).\n" +
                "IMPORTANT RULES:\n" +
                "- NEVER introduce yourself or say things like 'As an expert' or 'I\'ve analyzed'\n" +
                "- Be direct, concise, and actionable\n" +
                "- Use short bullet points, not long paragraphs\n" +
                "- Format with markdown: use **bold** for key terms, bullet lists for steps\n" +
                "- Keep the total response under 200 words\n" +
                "- Sound like a smart teammate, not a formal report\n\n" +
                "Analyze this incident timeline and give:\n" +
                "• Brief summary (2-3 lines max)\n" +
                "• Probable root cause\n" +
                "• Recommended next actions\n\n" +
                "Timeline:\n" + context;

        return callAiApi(prompt);
    }

    public String askAi(Long roomId, String userQuery, String callerEmail) {
        // Check room access
        roomService.getRoomById(roomId, callerEmail);
        
        List<IncidentTimelineDto> events = timelineService.getTimelineByRoomId(roomId);
        String context = events.stream()
                .map(e -> "[" + e.getCreatedAt() + "] " + e.getEventType() + ": " + e.getContent())
                .collect(Collectors.joining("\n"));

        String prompt = "You are CYAI, the built-in AI assistant of CyMOPS (an incident management platform).\n" +
                "IMPORTANT RULES:\n" +
                "- NEVER introduce yourself or say things like 'As an expert' or 'I\'ve analyzed'\n" +
                "- Be direct and conversational — like a senior engineer Slack-messaging a teammate\n" +
                "- Keep answers concise (under 150 words unless the question demands detail)\n" +
                "- Use markdown: **bold** for emphasis, bullet points for lists\n" +
                "- If the question is casual (e.g. 'how are u'), respond naturally and briefly\n\n" +
                "Incident context:\n" + context + "\n\n" +
                "User's question: " + userQuery;

        return callAiApi(prompt);
    }

    public String generatePostmortem(Long roomId, String callerEmail) {
        // Check room access
        roomService.getRoomById(roomId, callerEmail);
        
        List<IncidentTimelineDto> events = timelineService.getTimelineByRoomId(roomId);
        String context = events.stream()
                .map(e -> "[" + e.getCreatedAt() + "] " + e.getEventType() + ": " + e.getContent())
                .collect(Collectors.joining("\n"));

        String prompt = "You are an expert DevOps engineer writing a postmortem for a resolved incident.\n" +
                "Based on the following timeline, generate a postmortem document with the following sections:\n" +
                "- Timeline of Events\n" +
                "- Root Cause\n" +
                "- Impact\n" +
                "- Action Items (Fixes)\n\n" +
                "Timeline:\n" + context;

        return callAiApi(prompt);
    }

    public String generateEngineeringReportInsights(boolean refresh) {
        if (!refresh && isEngineeringInsightsCacheValid()) {
            return engineeringInsightsCache.get();
        }

        Map<String, Object> report;
        try {
            report = refresh
                    ? engineeringReportService.generateReport(true)
                    : engineeringReportService.getLatestReport();
        } catch (IllegalArgumentException e) {
            return "No GitHub repository report is available yet. Please link a repository or refresh the report manually in the Insights panel.";
        }

        String reportJson = report.toString();
        String prompt = "You are a senior SRE and DevOps staff engineer. Analyze the engineering health report below and return:\n" +
                "1. Executive summary (max 5 lines)\n" +
                "2. Top 3 immediate risks\n" +
                "3. Root-cause hypotheses connecting code and DB signals\n" +
                "4. 24-hour action plan\n" +
                "5. 7-day hardening plan\n\n" +
                "Engineering report:\n" + reportJson;

        String insights = callAiApi(prompt);
        cacheEngineeringInsights(insights);
        return insights;
    }

    public Map<String, Object> getHealthStatus() {
        String provider = aiProvider == null ? "" : aiProvider.trim().toLowerCase();
        String baseUrl = aiBaseUrl == null ? "" : aiBaseUrl.trim();
        String model = aiModel == null ? "" : aiModel.trim();

        boolean keyConfigured = apiKey != null && !apiKey.trim().isEmpty();
        boolean baseUrlConfigured = !baseUrl.isEmpty();
        boolean modelConfigured = !model.isEmpty();
        boolean providerSupported = "gemini".equals(provider) || "openai-compatible".equals(provider);

        List<String> issues = new ArrayList<>();
        if (!providerSupported) {
            issues.add("Unsupported ai.api.provider. Use gemini or openai-compatible.");
        }
        if (!keyConfigured) {
            issues.add("AI_API_KEY is missing.");
        }
        if (!baseUrlConfigured) {
            issues.add("AI_API_BASE_URL is missing.");
        }
        if (!modelConfigured) {
            issues.add("AI_MODEL is missing.");
        }
        if ("gemini".equals(provider)) {
            if (!baseUrl.contains("generativelanguage.googleapis.com")) {
                issues.add("Gemini provider expects AI_API_BASE_URL to point to generativelanguage.googleapis.com.");
            }
            if (keyConfigured && !apiKey.startsWith("AIza")) {
                issues.add("Gemini keys usually start with AIza. Verify AI_API_KEY.");
            }
        }

        boolean ready = issues.isEmpty();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ready", ready);
        result.put("status", ready ? "READY" : "NOT_READY");
        result.put("provider", provider.isEmpty() ? "unknown" : provider);
        result.put("model", model);
        result.put("baseUrlConfigured", baseUrlConfigured);
        result.put("apiKeyConfigured", keyConfigured);
        result.put("checks", Map.of(
                "providerSupported", providerSupported,
                "baseUrlConfigured", baseUrlConfigured,
                "modelConfigured", modelConfigured,
                "apiKeyConfigured", keyConfigured
        ));
        result.put("issues", issues);
        return result;
    }

    private void cacheEngineeringInsights(String insights) {
        if (insights == null || insights.isBlank()) {
            return;
        }
        engineeringInsightsCache.set(insights);
        engineeringInsightsCacheAt.set(Instant.now());
    }

    private String getResolvedApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            return apiKey.trim();
        }
        
        String sysEnv = System.getenv("AI_API_KEY");
        if (sysEnv != null && !sysEnv.trim().isEmpty()) {
            return sysEnv.trim();
        }
        
        // Fallback: Manually read .env file if Spring injection missed it
        try {
            java.io.File envFile = new java.io.File(".env");
            if (!envFile.exists()) {
                envFile = new java.io.File("backend/.env"); // In case running from parent dir
            }
            if (envFile.exists()) {
                java.util.List<String> lines = java.nio.file.Files.readAllLines(envFile.toPath());
                for (String line : lines) {
                    if (line.trim().startsWith("AI_API_KEY=")) {
                        return line.substring(line.indexOf("=") + 1).trim();
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to manually read .env: " + e.getMessage());
        }
        return null;
    }

    private String callAiApi(String prompt) {
        String resolvedKey = getResolvedApiKey();
        if (resolvedKey == null || resolvedKey.trim().isEmpty()) {
            return "AI key is not configured. Set AI_API_KEY in backend/.env and restart backend.";
        }

        try {
            String provider = aiProvider == null ? "" : aiProvider.trim().toLowerCase();
            if ("gemini".equals(provider)) {
                return callGeminiApi(prompt, resolvedKey);
            }

            return callOpenAiCompatibleApi(prompt, resolvedKey);
        } catch (Exception e) {
            System.err.println("[AiService] AI API call failed: " + e.getClass().getSimpleName() + " — " + e.getMessage());
            e.printStackTrace();
            // Return actual error so user knows what happened instead of silent mock
            return "⚠️ AI API call failed: " + e.getMessage() + "\n\nPlease verify your AI_API_KEY and network connectivity, then try again.";
        }
    }

    private String callGeminiApi(String prompt, String activeKey) {
        RestTemplate restTemplate = buildAiRestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
        ));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        
        String encodedKey = URLEncoder.encode(activeKey, StandardCharsets.UTF_8);
        String base = aiBaseUrl.endsWith("/") ? aiBaseUrl.substring(0, aiBaseUrl.length() - 1) : aiBaseUrl;
        String url = base + "/models/" + aiModel + ":generateContent?key=" + encodedKey;
        
        Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getOrDefault("candidates", Collections.emptyList());
        if (candidates.isEmpty()) {
            return "Gemini returned no candidates. Check AI_API_BASE_URL, AI_MODEL, and AI_API_KEY.";
        }

        Map<String, Object> content = (Map<String, Object>) candidates.get(0).getOrDefault("content", Collections.emptyMap());
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.getOrDefault("parts", Collections.emptyList());
        if (parts.isEmpty()) {
            return "Gemini response had no text parts. Check model permissions and safety settings.";
        }

        Object text = parts.get(0).get("text");
        return text == null ? "Gemini returned an empty text response." : text.toString();
    }

    private String callOpenAiCompatibleApi(String prompt, String activeKey) {
        RestTemplate restTemplate = buildAiRestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(activeKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", aiModel);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        Map<String, Object> response = restTemplate.postForObject(aiBaseUrl, request, Map.class);

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getOrDefault("choices", Collections.emptyList());
        if (choices.isEmpty()) {
            return "AI provider returned no choices. Check ai.api.base-url, model, and API key permissions.";
        }
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    private RestTemplate buildAiRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(aiConnectTimeoutMs);
        factory.setReadTimeout(aiReadTimeoutMs);
        return new RestTemplate(factory);
    }

    private boolean isEngineeringInsightsCacheValid() {
        String cached = engineeringInsightsCache.get();
        Instant cachedAt = engineeringInsightsCacheAt.get();
        if (cached == null || cached.isBlank() || cachedAt == null) {
            return false;
        }
        Duration age = Duration.between(cachedAt, Instant.now());
        return age.toMinutes() < insightsCacheMinutes;
    }

    private String generateMockResponse(String prompt) {
        if (prompt.contains("engineering health report")) {
            return "## Engineering Health Insights\n\n" +
                    "**Executive Summary:** Elevated delivery and operations risk detected due to CI failures and open DB incidents.\n\n" +
                    "**Top Risks:**\n" +
                    "- Failing workflows are blocking safe release velocity.\n" +
                    "- Open DB incidents suggest unresolved reliability debt.\n" +
                    "- Security alert backlog may increase incident probability.\n\n" +
                    "**24h Plan:** Stabilize CI, triage P1 database incidents, and enforce deployment guardrails.\n\n" +
                    "**7-day Plan:** Close critical security alerts, tune DB queries/pool limits, and add release quality gates.";
        }

        if (prompt.contains("postmortem")) {
            return "## Incident Postmortem\n\n" +
                    "**Timeline of Events:**\n" +
                    "- System started showing irregular behaviors.\n" +
                    "- Automated DB alerts fired.\n" +
                    "- Engineering team investigated and deployed a hotfix.\n\n" +
                    "**Root Cause:**\n" +
                    "A rogue query caused a full table scan leading to DB connection pool exhaustion.\n\n" +
                    "**Impact:**\n" +
                    "Approximately 1,200 failed requests over a 15-minute window.\n\n" +
                    "**Action Items:**\n" +
                    "- Add missing index on the affected table.\n" +
                    "- Implement query timeouts to prevent DB locks.";
        }

        if (prompt.contains("The engineer asks:")) {
            String question = "your question";
            try {
                int start = prompt.indexOf("The engineer asks: \"") + 20;
                int end = prompt.lastIndexOf("\"");
                question = prompt.substring(start, end);
            } catch (Exception e) {}
            
            return "Hi! You asked: *" + question + "*. \n\n" +
                   "I am currently running in **Mock Mode** because the AI API connection failed or the API key is a dummy value. " +
                   "To get real generative AI answers, please configure a valid `AI_API_KEY` in `backend/.env`.";
        }

        return "**Incident Summary:**\n" +
                "DB latency spike detected resulting in 1200 failed requests.\n\n" +
                "**Likely Root Cause:**\n" +
                "Connection pool exhaustion.\n\n" +
                "**Next Steps:**\n" +
                "- Check max_connections.\n" +
                "- Restart instances if stuck.\n" +
                "- Add indexing to recent queries.";
    }
}
