import { K8sShapeType } from '../types';

// Kubernetes icon paths - simplified versions of official K8s icons
export const K8S_ICON_PATHS: Record<K8sShapeType, string> = {
  'k8s-pod': `
    M24 4L4 14v20l20 10 20-10V14L24 4z
    M24 8l16 8-16 8-16-8 16-8z
    M8 18l16 8v12L8 30V18z
    M40 18v12l-16 8V26l16-8z
  `,
  'k8s-deployment': `
    M24 2L2 12v24l22 12 22-12V12L24 2z
    M24 6l18 9-18 9-18-9 18-9z
    M6 15l18 9v16L6 31V15z
    M42 15v16l-18 9V24l18-9z
    M24 18l10 5-10 5-10-5 10-5z
  `,
  'k8s-service': `
    M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z
    M24 8c8.84 0 16 7.16 16 16s-7.16 16-16 16S8 32.84 8 24 15.16 8 24 8z
    M24 14c5.52 0 10 4.48 10 10s-4.48 10-10 10-10-4.48-10-10 4.48-10 10-10z
  `,
  'k8s-ingress': `
    M44 20H28V8h-8v12H4v8h16v12h8V28h16v-8z
    M20 12h8v8h12v4H28v8h-8v-8H8v-4h12v-8z
  `,
  'k8s-configmap': `
    M8 4h32v8H8V4z
    M8 16h32v8H8v-8z
    M8 28h32v8H8v-8z
    M8 40h20v4H8v-4z
  `,
  'k8s-secret': `
    M24 4c-6.63 0-12 5.37-12 12v4H8v24h32V20h-4v-4c0-6.63-5.37-12-12-12z
    M24 8c4.42 0 8 3.58 8 8v4H16v-4c0-4.42 3.58-8 8-8z
    M24 28c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z
  `,
  'k8s-pv': `
    M4 8h40v32H4V8z
    M8 12h32v24H8V12z
    M12 16h24v4H12v-4z
    M12 24h24v4H12v-4z
    M12 32h12v4H12v-4z
  `,
  'k8s-pvc': `
    M4 8h40v32H4V8z
    M8 12h32v24H8V12z
    M16 20l8 8 8-8h-4v-4h-8v4h-4z
    M16 32h16v4H16v-4z
  `,
  'k8s-statefulset': `
    M24 2L4 12v24l20 12 20-12V12L24 2z
    M24 6l16 8v20l-16 8-16-8V14l16-8z
    M12 18h24v4H12v-4z
    M12 26h24v4H12v-4z
    M12 34h16v4H12v-4z
  `,
  'k8s-daemonset': `
    M4 4h40v40H4V4z
    M8 8h32v32H8V8z
    M12 12h10v10H12V12z
    M26 12h10v10H26V12z
    M12 26h10v10H12V26z
    M26 26h10v10H26V26z
  `,
  'k8s-job': `
    M24 4L4 14v20l20 10 20-10V14L24 4z
    M24 8l16 8-16 8-16-8 16-8z
    M20 24l-4 4 4 4 4-4-4-4z
    M28 24l-4 4 4 4 4-4-4-4z
  `,
  'k8s-cronjob': `
    M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z
    M24 8c8.84 0 16 7.16 16 16s-7.16 16-16 16S8 32.84 8 24 15.16 8 24 8z
    M22 12h4v14h-4V12z
    M22 12h14v4H22v-4z
  `,
  'k8s-namespace': `
    M4 4h40v40H4V4z
    M8 8h32v32H8V8z
    M12 12h24v6H12v-6z
    M12 22h24v14H12V22z
  `,
  'k8s-node': `
    M24 2L2 14v20l22 12 22-12V14L24 2z
    M24 6l18 10v16l-18 10-18-10V16l18-10z
    M24 14c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8z
  `,
  'k8s-hpa': `
    M4 20h8v8H4v-8z
    M16 16h8v16h-8V16z
    M28 12h8v20h-8V12z
    M40 8h8v24h-8V8z
    M2 36h44v4H2v-4z
  `,
  'k8s-networkpolicy': `
    M24 4L4 14v20l20 10 20-10V14L24 4z
    M24 8l16 8-16 8-16-8 16-8z
    M12 22l6 3-6 3v-6z
    M36 22v6l-6-3 6-3z
    M24 28l6 3-6 3-6-3 6-3z
  `,
};

interface K8sIconProps {
  type: K8sShapeType;
  size?: number;
  color?: string;
}

export function K8sIcon({ type, size = 48, color = '#326CE5' }: K8sIconProps) {
  const path = K8S_ICON_PATHS[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

// Get SVG path for use in Konva
export function getK8sIconPath(type: K8sShapeType): string {
  return K8S_ICON_PATHS[type] || '';
}

// Labels for K8s shapes
export const K8S_LABELS: Record<K8sShapeType, string> = {
  'k8s-pod': 'Pod',
  'k8s-deployment': 'Deployment',
  'k8s-service': 'Service',
  'k8s-ingress': 'Ingress',
  'k8s-configmap': 'ConfigMap',
  'k8s-secret': 'Secret',
  'k8s-pv': 'PV',
  'k8s-pvc': 'PVC',
  'k8s-statefulset': 'StatefulSet',
  'k8s-daemonset': 'DaemonSet',
  'k8s-job': 'Job',
  'k8s-cronjob': 'CronJob',
  'k8s-namespace': 'Namespace',
  'k8s-node': 'Node',
  'k8s-hpa': 'HPA',
  'k8s-networkpolicy': 'NetworkPolicy',
};
