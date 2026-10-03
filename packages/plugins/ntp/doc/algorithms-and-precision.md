<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-ntp</a>
</div>

<br>

# Cristian's Algorithm & Precision Engineering

`@magmacomputing/tempo-plugin-ntp` implements Flaviu Cristian's probabilistic clock synchronization algorithm over HTTP(S) with modern performance enhancements: high-resolution monotonic baselines, sub-millisecond `Server-Timing` headers, statistical jitter rejection, and Exponential Moving Average (EMA) smoothing.

---

## 1. Cristian's Algorithm Over HTTP

When a client queries a time endpoint over HTTP:

1. **$T_0$**: Client records its local timestamp immediately before sending the HTTP request.
2. **$T_{\text{server}}$**: Server records the current atomic timestamp when handling the request.
3. **$T_1$**: Client records its local timestamp immediately upon receiving the response.

```
Client                             Server
  |                                  |
  |--- HTTP Request (T0) ----------->|
  |                                  | (T_server)
  |<-- HTTP Response (T1) -----------|
  |                                  |
```

### Round-Trip Time (RTT)

$$\text{RTT} = T_1 - T_0$$

### Estimated Server Timestamp at Reception ($T_1$)

Assuming symmetrical network latency (outbound delay $\approx$ inbound delay $\approx \text{RTT} / 2$):

$$T_{\text{estimated}} = T_{\text{server}} + \frac{\text{RTT}}{2}$$

### Clock Drift Offset ($\theta$)

$$\theta = T_{\text{estimated}} - T_1 = T_{\text{server}} - \frac{T_0 + T_1}{2}$$

### Uncertainty Window ($\pm E$)

The maximum theoretical clock error bounds are:

$$E = \pm \frac{\text{RTT}}{2}$$

---

## 2. Sub-Millisecond Precision via `Server-Timing`

Standard HTTP `Date` headers have a coarse **1-second resolution** (`Date: Fri, 02 Oct 2026 06:15:00 GMT`), which introduces up to $\pm 500\text{ms}$ of quantization jitter.

`tempo-plugin-ntp` automatically prioritizes sub-millisecond timestamps delivered via the standard HTTP `Server-Timing` header:

```http
HTTP/1.1 200 OK
Date: Fri, 02 Oct 2026 06:15:00 GMT
Server-Timing: clock=1727856900123.45
Content-Type: application/json
```

If `Server-Timing` contains a `clock=...`, `server_time=...`, or `epoch=...` metric, the plugin parses the high-precision floating-point epoch timestamp, achieving sub-millisecond synchronization accuracy.

---

## 3. Statistical Jitter Rejection & Filtering

Transient network spikes (e.g., cell tower handoffs, packet retries) can cause anomalous RTT measurements. If an asynchronous network delay is heavily skewed in one direction, the symmetrical assumption ($\text{RTT}/2$) breaks down.

The plugin protects against skew distortion using **RTT Threshold Filtering**:
- Samples exceeding the configurable `maxAcceptableRttMs` threshold (default: `1000ms`) are immediately discarded.
- High-latency or asymmetrical network spikes are rejected without updating the active drift calibration.

---

## 4. Exponential Moving Average (EMA) Smoothing

Rather than jumping the clock offset instantaneously upon every sync sample (which could cause time to appear to skip or stutter), new samples are smoothed into the running offset using an Exponential Moving Average:

$$\theta_{t} = \alpha \cdot \theta_{\text{sample}} + (1 - \alpha) \cdot \theta_{t-1}$$

Where:
- $\alpha \in (0, 1]$ is the smoothing factor (default: `0.3`).
- On the very first sample ($t=0$), $\theta_0 = \theta_{\text{sample}}$ to establish immediate baseline calibration.

---

## 5. Monotonic Time Progression with Zero O(N) Overhead

Once calibrated, calling `Tempo.ntp.now()` is a purely synchronous, $O(1)$ calculation:

$$\text{Current Server Time} = \text{Date.now()} + \theta$$

Because the offset $\theta$ is continuously maintained in memory, your application can invoke `Tempo.ntp.now()` millions of times per second inside render loops or high-frequency calculation pipelines with zero performance penalty.
