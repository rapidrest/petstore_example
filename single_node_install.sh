#!/usr/bin/env bash
set -e
HOSTNAME=`hostname`
IS_WSL=false
DOMAIN="cluster.local"
TLS=true
VERSION="1.0.23-cjs"
UNINSTALL=false
SKIP_K3S=false
# Internal vars
LINES=$(tput lines)
COLS=$(tput cols)
total_steps=9
current=0
current_step="Initializing..."
previous_step=""
progress_line=""
running=true

# Shared functions
function addHelmRepo() {
  REPO_NAME=$1
  REPO_URL=$2
  if [[ `helm repo list|grep percona | wc -l` -eq 0 ]]; then
    echo "Adding helm repo $REPO_NAME - $REPO_URL"
    helm repo add $REPO_NAME $REPO_URL
  fi
}

function draw_progress() {
  local template="$current_step... [$current/$total_steps]%s %d%% "
  local template_length=${#template}
  local bar_char='|'
  local percent_done=$(( current * 100 / total_steps ))
  local length=$(( COLS - template_length ))
  local num_bars=$(( percent_done * length / 100 ))

  local i
  local s='['
  for ((i = 0; i < num_bars; i++)); do
    s+=$bar_char
  done
  for ((i = num_bars; i < length; i++)); do
    s+=' '
  done
  s+=']'

  printf '\e7' # save the cursor location
  printf '\e[%d;%dH' "$LINES" 0 # move cursor to the bottom line
  printf '\e[0K' # clear the line
  printf "$template" "$s" "$percent_done" # print the progress bar
  printf '\e8' # restore the cursor location
}

# Background refresher
function progress_loop() {
  if [[ "$1" != "--bg" ]]; then
      echo "ERROR: progress_loop must be run in background" >&2
      exit 1
  fi

  echo
  while $running; do
      draw_progress
      sleep 0.2
  done
  draw_progress
}

function run_step() {
  previous_step=$current_step
  current_step="$1"
  if [[ "$previous_step" != "" ]]; then
    echo "[$current/$total_steps] $previous_step... Done"
  fi
  current=$(( current + 1 ))
  draw_progress
}

function cleanup() {
  running=false
  if [[ -n "$progress_pid" ]] && kill -0 "$progress_pid" 2>/dev/null; then
      kill "$progress_pid" 2>/dev/null
      wait "$progress_pid" 2>/dev/null
  fi
}

function uninstall() {
  echo "Restoring nginx.conf..."
  sudo mv /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
  echo "Removing nginx..."
  sudo apt-get remove nginx -y
  echo "Removing helm..."
  if command -v snap >/dev/null 2>&1; then
    sudo snap remove helm
  else
    echo "Unable to remove helm. Please uninstall manually."
  fi
  echo "Removing k3s..."
  sudo /usr/local/bin/k3s-uninstall.sh
  echo "Removing kubectl..."
  if command -v snap >/dev/null 2>&1; then
    sudo snap remove kubectl
  else
    echo "Unable to remove kubectl. Please uninstall manually."
  fi
  echo "Uninstall complete!"
}

GETOPT=$(getopt -o h --long domain,version,uninstall,install-cert-manager,skip-k3s,help -- "$@")
eval set -- "$GETOPT"
while true
do
    case "$1" in
        --domain) DOMAIN=$2; shift 2;;
        --version) VERSION=$2; shift 2;;
        --tls) TLS=$2 shift 2;;
        --skip-k3s) SKIP_K3S=true; shift;;
        --uninstall) UNINSTALL=true; shift;;
        --install-cert-manager) TLS=true; shift;;
        -h | --help)
          echo "This scripts sets up a complete single-node k3s (Kubernetes) cluster. No arguments will do an install"
          echo "During install this will install the following:"
          echo "\tk3s - Kubernetes distribution"
          echo "\tnginx - Nginx to handle proxying traffic"
          echo "\thelm - Helm to handle install/update software in k3s"
          echo "\kubectl - Provide api interaction with k3s"

          echo "Usage:"
          echo -e "\t--domain <domain>\t\tThe domain name to use for the deployment of petstore"
          echo -e "\t--version <version>\t\tThe version of petstore to deploy"
          echo -e "\t--tls <true|false>\t\tInstalls cert manager and enables TLS ingress support (uses Let's Encrypt)"
          echo -e "\t--skip-k3s\t\tSkips installation of k3s"
          echo -e "\t--uninstall\t\tUninstalls all installed items"
          exit 1
          ;;
        ?)
          echo "Invalid option: -${OPTARG}."
          exit 1
          ;;
        --) shift; break;;
        *) break;;
    esac
done

# Catch Ctrl-C, kill, termination, normal exit
trap cleanup EXIT INT TERM

# Start background progress bar
progress_loop --bg &
progress_pid=$!

# Detect the OS distribution and set the correct package manager
run_step "Updating system packages"
if [[ -e /etc/redhat-release ]]; then
  echo "Detected RHEL based operating system."
  PMCMD="dnf"
  sudo dnf check-update
elif [[ $(grep -i Microsoft /proc/version) ]]; then
  echo "Bash is running on WSL"
  PMCMD="apt"
  sudo apt -qq update
  IS_WSL=true
# Check if /etc/debian_version exists
elif [[ -e /etc/debian_version ]]; then
  echo "Detected Debian/Ubuntu based operating system."
  PMCMD="apt-get"
  sudo apt-get update
else
  echo "Unable to determine Linux distribution."
  exit 1
fi

run_step "Installing kubectl"
if ! command -v kubectl &> /dev/null; then
    if command -v snap >/dev/null 2>&1; then
      sudo snap install --classic kubectl
    else
      curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl";
    fi
fi
if [[ "$KUBECONFIG" != "" ]]; then
  echo "KUBECONFIG currently defined as $KUBECONFIG, would you like to use this config or clear it?"
  select choice in "Use" "Clear"; do
    case $choice in
        Use ) break;;
        Clear ) unset KUBECONFIG; break;;
    esac
  done
fi

# For WSL check for another installation
run_step "Installing kubernetes (k3s)"
if [[ "$IS_WSL" = "true" ]]; then
  if [[ `kubectl get nodes| grep ' Ready '| wc -l` -eq 1 ]]; then
    SKIP_K3S=true
    echo "Skipping installation of k3s"
  fi
fi

if [ "SKIP_K3S" = "false" ]; then
  if [[ `ps -aef|grep "docker serve"|grep -v grep|wc -l` -ne 0 ]]; then
    echo "Docker appears to be running and will cause issues with k3s"
    ps -aef|grep "docker serve"|grep -v grep
    exit 1
  fi
  if [ -z "$KUBECONFIG" ]; then
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  fi
  if [ `kubectl get nodes| grep ' Ready '| wc -l` -eq 0 ]; then
    # Install k3s
    echo "Installing k3s..."
    curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" INSTALL_K3S_EXEC="--flannel-backend=none --cluster-cidr=192.168.0.0/16 --disable-network-policy --disable=traefik" sh -
    if [ $? -ne 0 ]; then
      echo "There was a problem installing k3s."
      exit 1
    fi
    if [[ `grep "export KUBECONFIG=$KUBECONFIG" ~/.bashrc |wc -l` -eq 0 ]]; then
      echo "export KUBECONFIG=$KUBECONFIG" >> ~/.bashrc
    fi

    # Install Calico (calico must be installed before k3s nodes will be ready)
    echo "Installing calico..."
    kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/manifests/tigera-operator.yaml
    kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/manifests/custom-resources.yaml

    echo "Checking k3s has started..."
    result=`kubectl get nodes | grep ' Ready '| wc -l`
    startTime=`date +%s`
    while [[ $result -eq 0 && `expr \`date +%s\` - $startTime` -lt 1800 ]]; do
      sleep 2
      echo "Waiting for k3s nodes to be ready..."
      result=`kubectl get nodes | grep ' Ready '| wc -l`
    done
    if [ $result -eq 0 ]; then
      echo "There was a problem installing k3s..."
      exit 1
    else
      echo "k3s is running!"
    fi

    # Verify that k3s is up and running
    echo "Checking calico has started..."
    result=`kubectl -n calico-system get pods | grep -v 'Running' | wc -l`
    startTime=`date +%s`
    while [[ $result -ne 1 && `expr \`date +%s\` - $startTime` -lt 1800 ]]; do
      sleep 2
      echo "Waiting for calico-system to start..."
      result=`kubectl -n calico-system get pods | grep -v 'Running' | wc -l`
    done
    if [ $result -ne 1 ]; then
      echo "There was a problem installing calico..."
      exit 1
    else
      echo "Calico is running!"
    fi
  else
    echo "k3s is already installed."
  fi # Check k8s is installed
fi

# Install metrics-server
run_step "Installing metrics server"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install Helm
run_step "Installing helm"
if [[ `helm version` ]]; then
  echo "helm is already installed."
else
  if command -v snap >/dev/null 2>&1; then
    snap install --classic kubectl
  else
    curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | sudo bash
    if [ $? -ne 0 ]; then
      echo "There was a problem installing helm."
      exit 1
    fi
  fi
fi

# Install ingress-nginx
run_step "Installing ingress-nginx"
addHelmRepo ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install nginx ingress-nginx/ingress-nginx \
    --namespace nginx \
    --create-namespace \
    --set rbac.create=true \
    --set controller.service.externalTrafficPolicy=Local \
    --set controller.service.nodePorts.http=30080 \
    --set controller.service.nodePorts.https=30443 \
    --set controller.service.type=NodePort \
    --set-string controller.allowSnippetAnnotations=true,controller.config.use-forward-headers=true,controller.config.compute-full-forward-for=true,controller.config.ssl-protocols="TLSv1.2 TLSv1.3",controller.config.ssl-ciphers="ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA384"
echo "Checking ingress-nginx has started..."
result=`kubectl -n nginx get pods | grep -v 'Running' | wc -l`
startTime=`date +%s`
while [[ $result -ne 1 && `expr \`date +%s\` - $startTime` -lt 1800 ]]; do
  sleep 2
  echo "Waiting for nginx-ingress to start..."
  result=`kubectl -n nginx get pods | grep -v 'Running' | wc -l`
done
if [ $result -ne 1 ]; then
  echo "There was a problem installing ingress-nginx..."
  exit 1
else
  echo "ingress-nginx is running!"
fi

# Set up nginx reverse proxy
run_step "Installing nginx reverse proxy"
if [[ -e /etc/redhat-release ]]; then
  if [ ! `dnf list installed | grep nginx` ]; then
    echo "Installing nginx for reverse proxy..."
    sudo dnf install nginx -y
    if [ $? -ne 0 ]; then
      echo "There was a problem installing nginx reverse proxy."
      exit 1
    fi
  fi
else
  if [[ ! `apt list --installed | grep nginx` ]]; then
    echo "Installing nginx for reverse proxy..."
    sudo apt-get install nginx -y
    if [ $? -ne 0 ]; then
      echo "There was a problem installing nginx reverse proxy."
      exit 1
    fi
  fi
fi
if [ `cat /etc/nginx/nginx.conf | grep "proxy_pass 127.0.0.1:30080" | wc -l` -eq 0 ]; then
  echo "Backing up nginx.conf..."
  sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
  echo "Writing nginx configuration..."
  sudo bash -c 'cat << EOF >> /etc/nginx/nginx.conf

stream {
    server {
        listen 80;
        proxy_pass 127.0.0.1:30080;
    }
    server {
        listen 443;
        proxy_pass 127.0.0.1:30443;
    }
}
EOF'
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    sudo rm /etc/nginx/sites-enabled/default
  fi
  sudo systemctl restart nginx
  if [ $? -ne 0 ]; then
    echo "There was a problem restarting nginx reverse proxy."
    exit 1
  fi
  sleep 10
  NGINX_READY=0
  startTime=`date +%s`
  while [[ $result -ne 1 && `expr \`date +%s\` - $startTime` -lt 1800 ]]; do
    sleep 2
    echo "Waiting for nginx to start..."
    curl http://localhost
    if [ $? -eq 0 ]; then
      NGINX_READY=1
    fi
  done
  if [ $NGINX_READY -eq 0 ]; then
    echo "There was a problem configuring nginx reverse proxy."
    exit 1
  fi
fi
echo "Reverse proxy is setup."

if [[ "$TLS" = "true" ]]; then
  # Install cert-manager
  run_step "Installing cert-manager"
  addHelmRepo jetstack https://charts.jetstack.io
  helm repo update
  helm upgrade --install cert-manager jetstack/cert-manager \
      --namespace cert-manager \
      --create-namespace \
      --set crds.enabled=true \
      --set ingressShim.defaultIssuerName=letsencrypt-prod \
      --set ingressShim.defaultIssuerKind=ClusterIssuer
  echo "Checking cert-manager has started..."
  result=`kubectl -n cert-manager get pods | grep -v 'Running' | wc -l`
  startTime=`date +%s`
  while [[ $result -ne 1 && `expr \`date +%s\` - $startTime` -lt 1800 ]]; do
    sleep 2
    echo "Waiting for cert-manager to start..."
    result=`kubectl -n cert-manager get pods | grep -v 'Running' | wc -l`
  done
  if [ $result -ne 1 ]; then
    echo "There was a problem installing cert-manager..."
    exit 1
  else
    echo "cert-manager is running!"
  fi

  cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
    name: letsencrypt-prod
spec:
    acme:
        server: https://acme-v02.api.letsencrypt.org/directory
        email: admin@$HOSTNAME
        privateKeySecretRef:
            name: letsencrypt-prod
        solvers:
        - http01:
            ingress:
                class: nginx
EOF
fi

run_step "Installing petstore"
# Add Bitnami helm repo
addHelmRepo bitnami https://charts.bitnami.com/bitnami
helm repo up

helm upgrade --install --create-namespace --namespace $NAMESPACE $NAMESPACE oci://ghcr.io/rapidrest/charts/petstore --version $VERSION --set domain=$DOMAIN --set host=$DOMAIN --set ingress.tls=$TLS

# Stop background loop
running=false
wait "$progress_pid"

echo "Installation complete."

if [[ $DOMAIN =~ .*.local ]]; then
  echo "Please update the hosts file to resolve the following:"
  echo -e "\t $DOMAIN"
fi