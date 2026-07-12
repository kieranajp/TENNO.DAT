{{/*
VPN sidecar (gluetun / Mullvad) for the tenno API.

Routes only public egress (e.g. api.warframe.com — DE blocks our home + CF IPs)
through Mullvad; in-cluster traffic goes direct via outboundSubnets, and
keepClusterDNS leaves CoreDNS in place so `tenno-postgresql` still resolves.

WireGuard creds come from the `tenno-secrets` 1Password item — add these fields:
  WIREGUARD_PRIVATE_KEY, WIREGUARD_ADDRESSES

Requires the namespace to allow NET_ADMIN + hostPath (pod-security: privileged).
*/}}

{{- define "vpn.container" -}}
- name: gluetun
  image: {{ .Values.vpn.image | default "qmcgaw/gluetun:v3.41.1" }}
  securityContext:
    # gluetun needs root to write its iptables kill-switch; the pod-level
    # runAsUser 1001 (for the API) would otherwise force it non-root and it
    # can't open /run/xtables.lock. Container context overrides pod context.
    runAsUser: 0
    runAsNonRoot: false
    capabilities:
      add:
        - NET_ADMIN
  env:
    - name: VPN_SERVICE_PROVIDER
      value: {{ .Values.vpn.provider | default "mullvad" }}
    - name: VPN_TYPE
      value: wireguard
    - name: WIREGUARD_PRIVATE_KEY
      valueFrom:
        secretKeyRef:
          name: {{ .Values.secretName }}
          key: WIREGUARD_PRIVATE_KEY
    - name: WIREGUARD_ADDRESSES
      valueFrom:
        secretKeyRef:
          name: {{ .Values.secretName }}
          key: WIREGUARD_ADDRESSES
    {{- if .Values.vpn.serverCountries }}
    - name: SERVER_COUNTRIES
      value: {{ .Values.vpn.serverCountries | quote }}
    {{- end }}
    {{- if .Values.vpn.outboundSubnets }}
    - name: FIREWALL_OUTBOUND_SUBNETS
      value: {{ .Values.vpn.outboundSubnets | quote }}
    {{- end }}
    {{- if .Values.vpn.inputPorts }}
    - name: FIREWALL_INPUT_PORTS
      value: {{ .Values.vpn.inputPorts | quote }}
    {{- end }}
    {{- if .Values.vpn.keepClusterDNS }}
    - name: DNS_KEEP_NAMESERVER
      value: "on"
    {{- end }}
  volumeMounts:
    - name: vpn-tun
      mountPath: /dev/net/tun
  resources:
    limits:
      cpu: 500m
      memory: 256Mi
    requests:
      cpu: 50m
      memory: 64Mi
  livenessProbe:
    exec:
      command:
        - /gluetun-entrypoint
        - healthcheck
    initialDelaySeconds: 30
    periodSeconds: 30
  readinessProbe:
    exec:
      command:
        - /gluetun-entrypoint
        - healthcheck
    initialDelaySeconds: 10
    periodSeconds: 10
{{- end }}

{{- define "vpn.volumes" -}}
- name: vpn-tun
  hostPath:
    path: /dev/net/tun
    type: CharDevice
{{- end }}
