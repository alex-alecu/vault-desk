################################################################################
# vault-agent-init
################################################################################

VAULT_AGENT_INIT_VERSION = 1
VAULT_AGENT_INIT_SITE = $(BR2_EXTERNAL_VAULT_PROBE_PATH)/package/vault-agent-init/src
VAULT_AGENT_INIT_SITE_METHOD = local
VAULT_AGENT_INIT_LICENSE = Apache-2.0

define VAULT_AGENT_INIT_BUILD_CMDS
	$(TARGET_CC) $(TARGET_CFLAGS) -std=c17 -Wall -Wextra -Werror \
		-o $(@D)/vault-agent-init $(@D)/vault-agent-init.c
endef

define VAULT_AGENT_INIT_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/vault-agent-init $(TARGET_DIR)/sbin/init
	$(INSTALL) -D -m 0755 $(@D)/vault-agent.py $(TARGET_DIR)/opt/vault/agent.py
	rm -rf $(TARGET_DIR)/usr/lib/python3.14/ensurepip
endef

$(eval $(generic-package))
