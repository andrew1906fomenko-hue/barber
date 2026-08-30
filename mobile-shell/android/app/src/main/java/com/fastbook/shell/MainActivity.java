package com.fastbook.shell;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.text.format.Formatter;
import android.text.InputType;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletionService;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {
    private static final String PREFS = "fastbook_shell";
    private static final String PREF_BASE_URL = "base_url";
    private static final int[] PORTS = {3000, 3001, 3016};
    private static final String[] COMMON_PRIVATE_PREFIXES = {
            "192.168.0.", "192.168.1.", "192.168.31.", "192.168.43.",
            "192.168.100.", "192.168.137.", "172.20.10.", "10.0.0.",
            "10.0.1.", "10.0.2.", "10.0.3.", "10.100.140."
    };
    private static final int CONNECT_TIMEOUT_MS = 650;
    private static final int READ_TIMEOUT_MS = 650;

    private WebView webView;
    private LinearLayout statusPanel;
    private TextView titleView;
    private TextView detailView;
    private ProgressBar progressBar;
    private Button retryButton;
    private EditText manualUrlInput;
    private Button openManualButton;
    private ExecutorService discoveryExecutor;
    private float pullStartY;
    private boolean pullRefreshCandidate;
    private boolean pullRefreshArmed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        configureWebView();
        discoverAndOpen();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith("http://")) {
                    saveBaseUrl(toBaseUrl(url));
                    showWebView();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request == null || request.isForMainFrame()) {
                    showStatus("Сервер не отвечает", "Ищу FastBook в локальной сети...");
                    discoverAndOpen();
                }
            }
        });

        webView.setOnTouchListener((view, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    pullStartY = event.getY();
                    pullRefreshCandidate = webView.getScrollY() == 0;
                    pullRefreshArmed = false;
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (pullRefreshCandidate && webView.getScrollY() == 0) {
                        float distance = event.getY() - pullStartY;
                        pullRefreshArmed = distance > dp(96);
                    }
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    if (pullRefreshCandidate && pullRefreshArmed && webView.getScrollY() == 0) {
                        refreshCurrentPage();
                    }
                    pullRefreshCandidate = false;
                    pullRefreshArmed = false;
                    break;
                default:
                    break;
            }
            return false;
        });
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        statusPanel = new LinearLayout(this);
        statusPanel.setOrientation(LinearLayout.VERTICAL);
        statusPanel.setGravity(Gravity.CENTER);
        statusPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        statusPanel.setBackgroundColor(Color.WHITE);

        titleView = new TextView(this);
        titleView.setTextColor(Color.rgb(24, 24, 27));
        titleView.setTextSize(22);
        titleView.setGravity(Gravity.CENTER);
        titleView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);

        detailView = new TextView(this);
        detailView.setTextColor(Color.rgb(82, 82, 91));
        detailView.setTextSize(15);
        detailView.setGravity(Gravity.CENTER);
        detailView.setPadding(0, dp(10), 0, dp(18));

        progressBar = new ProgressBar(this);

        retryButton = new Button(this);
        retryButton.setText("Найти снова");
        retryButton.setAllCaps(false);
        retryButton.setOnClickListener(v -> discoverAndOpen());

        manualUrlInput = new EditText(this);
        manualUrlInput.setSingleLine(true);
        manualUrlInput.setHint("IPv4 ПК или URL");
        manualUrlInput.setTextColor(Color.rgb(24, 24, 27));
        manualUrlInput.setHintTextColor(Color.rgb(113, 113, 122));
        manualUrlInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);

        openManualButton = new Button(this);
        openManualButton.setText("Открыть");
        openManualButton.setAllCaps(false);
        openManualButton.setOnClickListener(v -> openManualAddress());

        statusPanel.addView(titleView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        statusPanel.addView(detailView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        statusPanel.addView(progressBar, new LinearLayout.LayoutParams(dp(44), dp(44)));
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        buttonParams.topMargin = dp(18);
        statusPanel.addView(retryButton, buttonParams);
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        inputParams.topMargin = dp(18);
        inputParams.leftMargin = dp(18);
        inputParams.rightMargin = dp(18);
        statusPanel.addView(manualUrlInput, inputParams);
        statusPanel.addView(openManualButton, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        root.addView(statusPanel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        setContentView(root);
    }

    private void discoverAndOpen() {
        showStatus("Подключаюсь к FastBook", "Проверяю сохраненный адрес и текущую Wi-Fi сеть.");

        if (discoveryExecutor != null) {
            discoveryExecutor.shutdownNow();
        }
        discoveryExecutor = Executors.newFixedThreadPool(48);

        Thread coordinator = new Thread(() -> {
            String baseUrl = findServer();
            runOnUiThread(() -> {
                if (baseUrl == null) {
                    showStatus("FastBook не найден", "Оставьте точку доступа включенной, запустите scripts\\start-mobile-dev.ps1 на ПК или введите IPv4 компьютера ниже.");
                    progressBar.setVisibility(View.GONE);
                    retryButton.setVisibility(View.VISIBLE);
                    manualUrlInput.setVisibility(View.VISIBLE);
                    openManualButton.setVisibility(View.VISIBLE);
                    return;
                }

                saveBaseUrl(baseUrl);
                webView.loadUrl(baseUrl);
            });
        }, "FastBookDiscovery");
        coordinator.start();
    }

    private String findServer() {
        Set<String> candidates = new LinkedHashSet<>();
        String saved = getSavedBaseUrl();
        if (saved != null) {
            candidates.add(saved);
        }

        for (String hotspotClientIp : getHotspotClientIps()) {
            for (int port : PORTS) {
                candidates.add("http://" + hotspotClientIp + ":" + port);
            }
        }

        for (int port : PORTS) {
            candidates.add("http://10.0.2.2:" + port);
            candidates.add("http://10.0.3.2:" + port);
        }

        for (String candidate : candidates) {
            if (isFastBookReachable(candidate)) {
                return candidate;
            }
        }

        List<String> subnetCandidates = buildSubnetCandidates();
        CompletionService<String> completionService = new ExecutorCompletionService<>(discoveryExecutor);
        int submitted = 0;
        for (String candidate : subnetCandidates) {
            completionService.submit((Callable<String>) () -> isFastBookReachable(candidate) ? candidate : null);
            submitted++;
        }

        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(16);
        for (int i = 0; i < submitted && System.nanoTime() < deadline; i++) {
            try {
                Future<String> future = completionService.poll(900, TimeUnit.MILLISECONDS);
                if (future == null) {
                    continue;
                }
                String found = future.get();
                if (found != null) {
                    discoveryExecutor.shutdownNow();
                    return found;
                }
            } catch (Exception ignored) {
                // Keep scanning other hosts.
            }
        }

        return null;
    }

    private List<String> getHotspotClientIps() {
        Set<String> result = new LinkedHashSet<>();
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/net/arp"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.trim().split("\\s+");
                if (parts.length >= 4 && isPrivateIpv4(parts[0]) && !"00:00:00:00:00:00".equals(parts[3])) {
                    result.add(parts[0]);
                }
            }
        } catch (Exception ignored) {
            // Some Android builds hide ARP data; subnet scanning and manual input remain available.
        }
        return new ArrayList<>(result);
    }

    private List<String> buildSubnetCandidates() {
        Set<String> result = new LinkedHashSet<>();
        Set<String> prefixes = new LinkedHashSet<>();
        List<String> phoneIps = getPhonePrivateIps();
        for (String phoneIp : phoneIps) {
            String[] parts = phoneIp.split("\\.");
            if (parts.length == 4) {
                prefixes.add(parts[0] + "." + parts[1] + "." + parts[2] + ".");
            }
        }
        Collections.addAll(prefixes, COMMON_PRIVATE_PREFIXES);

        Set<Integer> ownHosts = new LinkedHashSet<>();
        for (String phoneIp : phoneIps) {
            String[] parts = phoneIp.split("\\.");
            if (parts.length == 4) {
                ownHosts.add(parseInt(parts[3], -1));
            }
        }

        for (String prefix : prefixes) {
            addLikelyHosts(result, prefix, ownHosts);
        }

        return new ArrayList<>(result);
    }

    private void addLikelyHosts(Set<String> result, String prefix, Set<Integer> ownHosts) {
        for (int port : PORTS) {
            for (int host = 1; host <= 254; host++) {
                if (ownHosts.contains(host)) {
                    continue;
                }
                result.add("http://" + prefix + host + ":" + port);
            }
        }
    }

    private boolean isFastBookReachable(String baseUrl) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(baseUrl + "/");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setUseCaches(false);
            connection.setRequestProperty("User-Agent", "FastBook-Android-Shell");
            int code = connection.getResponseCode();
            return code >= 200 && code < 500;
        } catch (IOException ignored) {
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private List<String> getPhonePrivateIps() {
        Set<String> addresses = new LinkedHashSet<>();

        try {
            WifiManager wifiManager = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null && wifiManager.getConnectionInfo() != null) {
                int ipAddress = wifiManager.getConnectionInfo().getIpAddress();
                if (ipAddress != 0) {
                    String formatted = Formatter.formatIpAddress(ipAddress);
                    if (isPrivateIpv4(formatted)) {
                        addresses.add(formatted);
                    }
                }
            }
        } catch (Exception ignored) {
            // Continue with NetworkInterface fallback.
        }

        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface networkInterface : interfaces) {
                if (!networkInterface.isUp() || networkInterface.isLoopback()) {
                    continue;
                }
                List<InetAddress> inetAddresses = Collections.list(networkInterface.getInetAddresses());
                for (InetAddress inetAddress : inetAddresses) {
                    if (inetAddress instanceof Inet4Address && !inetAddress.isLoopbackAddress()) {
                        String hostAddress = inetAddress.getHostAddress();
                        if (isPrivateIpv4(hostAddress)) {
                            addresses.add(hostAddress);
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // The common private subnet fallback still gives the app a chance.
        }

        return new ArrayList<>(addresses);
    }

    private boolean isPrivateIpv4(String ip) {
        return ip != null && (
                ip.startsWith("192.168.") ||
                        ip.startsWith("10.") ||
                        ip.startsWith("172.16.") ||
                        ip.startsWith("172.17.") ||
                        ip.startsWith("172.18.") ||
                        ip.startsWith("172.19.") ||
                        ip.startsWith("172.20.") ||
                        ip.startsWith("172.21.") ||
                        ip.startsWith("172.22.") ||
                        ip.startsWith("172.23.") ||
                        ip.startsWith("172.24.") ||
                        ip.startsWith("172.25.") ||
                        ip.startsWith("172.26.") ||
                        ip.startsWith("172.27.") ||
                        ip.startsWith("172.28.") ||
                        ip.startsWith("172.29.") ||
                        ip.startsWith("172.30.") ||
                        ip.startsWith("172.31.")
        );
    }

    private void showStatus(String title, String detail) {
        titleView.setText(title);
        detailView.setText(detail);
        progressBar.setVisibility(View.VISIBLE);
        retryButton.setVisibility(View.GONE);
        manualUrlInput.setVisibility(View.GONE);
        openManualButton.setVisibility(View.GONE);
        statusPanel.setVisibility(View.VISIBLE);
        webView.setVisibility(View.GONE);
    }

    private void openManualAddress() {
        String value = manualUrlInput.getText().toString().trim();
        if (value.isEmpty()) {
            return;
        }

        String baseUrl = normalizeManualAddress(value);
        saveBaseUrl(baseUrl);
        showStatus("Открываю FastBook", baseUrl);
        webView.loadUrl(baseUrl);
    }

    private void refreshCurrentPage() {
        Toast.makeText(this, "Обновляю страницу", Toast.LENGTH_SHORT).show();
        webView.clearCache(false);
        webView.reload();
    }

    private String normalizeManualAddress(String value) {
        String normalized = value;
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://" + normalized;
        }
        try {
            URL parsed = new URL(normalized);
            if (parsed.getPort() == -1) {
                return parsed.getProtocol() + "://" + parsed.getHost() + ":3000";
            }
        } catch (Exception ignored) {
            return normalized;
        }
        return normalized;
    }

    private void showWebView() {
        webView.setVisibility(View.VISIBLE);
        statusPanel.setVisibility(View.GONE);
    }

    private String getSavedBaseUrl() {
        return getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_BASE_URL, null);
    }

    private void saveBaseUrl(String baseUrl) {
        SharedPreferences.Editor editor = getSharedPreferences(PREFS, MODE_PRIVATE).edit();
        editor.putString(PREF_BASE_URL, baseUrl);
        editor.apply();
    }

    private String toBaseUrl(String url) {
        try {
            URL parsed = new URL(url);
            return parsed.getProtocol() + "://" + parsed.getHost() + ":" + parsed.getPort();
        } catch (Exception ignored) {
            return url;
        }
    }

    private int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (discoveryExecutor != null) {
            discoveryExecutor.shutdownNow();
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
