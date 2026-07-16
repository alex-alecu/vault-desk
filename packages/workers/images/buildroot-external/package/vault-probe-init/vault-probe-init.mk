################################################################################
# vault-probe-init
################################################################################

VAULT_PROBE_INIT_VERSION = 1
VAULT_PROBE_INIT_SITE = $(BR2_EXTERNAL_VAULT_PROBE_PATH)/package/vault-probe-init/src
VAULT_PROBE_INIT_SITE_METHOD = local

define VAULT_PROBE_INIT_BUILD_CMDS
	$(TARGET_CC) $(TARGET_CFLAGS) -static -std=c17 -Wall -Wextra -Werror \
		-o $(@D)/vault-probe-init $(@D)/vault-probe-init.c
endef

define VAULT_PROBE_INIT_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/vault-probe-init $(TARGET_DIR)/sbin/init
endef

$(eval $(generic-package))
