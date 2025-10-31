all: build install lint

.PHONY: build install install-native-host install-browser-integration

build:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

install:
	mkdir -p ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/
	cp -R ./* ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/

# Install native messaging host for browser tab integration
install-native-host:
	@echo "Installing native messaging host..."
	@# Install the Python script
	install -m 755 native-host/tab-provider-host.py /usr/bin/searchlight-tab-provider
	@# Install native messaging manifests
	mkdir -p /etc/opt/chrome/native-messaging-hosts/
	mkdir -p /etc/opt/brave/native-messaging-hosts/
	install -m 644 native-host/com.searchlight.tabprovider.json /etc/opt/chrome/native-messaging-hosts/
	install -m 644 native-host/com.searchlight.tabprovider.json /etc/opt/brave/native-messaging-hosts/
	@# Also install in user directories as fallback
	@if [ -n "$$SUDO_USER" ]; then \
		REAL_USER=$$SUDO_USER; \
	else \
		REAL_USER=$$USER; \
	fi; \
	USER_HOME=$$(eval echo ~$$REAL_USER); \
	echo "Installing for user: $$REAL_USER ($$USER_HOME)"; \
	mkdir -p $$USER_HOME/.config/google-chrome/NativeMessagingHosts/; \
	mkdir -p $$USER_HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/; \
	install -m 644 -o $$REAL_USER native-host/com.searchlight.tabprovider.json $$USER_HOME/.config/google-chrome/NativeMessagingHosts/; \
	install -m 644 -o $$REAL_USER native-host/com.searchlight.tabprovider.json $$USER_HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/; \
	mkdir -p $$USER_HOME/.cache/search-light; \
	chown -R $$REAL_USER:$$REAL_USER $$USER_HOME/.cache/search-light
	@echo ""
	@echo "✓ Native messaging host installed successfully!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Install the browser extension:"
	@echo "     - Open brave://extensions/ or chrome://extensions/"
	@echo "     - Enable Developer Mode"
	@echo "     - Click 'Load unpacked'"
	@echo "     - Select: $$(pwd)/browser-extension/"
	@echo ""
	@echo "  2. Restart GNOME Shell (Alt+F2, type 'r', Enter)"
	@echo ""
	@echo "  3. Test: tail -f ~/.cache/search-light/native-host.log"
	@echo ""

# Install complete browser integration (GNOME extension + native host)
install-browser-integration: install
	@echo "Installing browser tab integration..."
	@if [ "$$EUID" != "0" ]; then \
		echo "Installing GNOME extension (user-level)..."; \
		$(MAKE) install; \
		echo ""; \
		echo "To complete installation, run with sudo:"; \
		echo "  sudo make install-native-host"; \
	else \
		echo "Installing native host (system-level)..."; \
		$(MAKE) install-native-host; \
		echo ""; \
		echo "GNOME extension must be installed as your user."; \
		echo "Run without sudo: make install"; \
	fi

publish:
	rm -rf build
	mkdir build
	cp LICENSE ./build
	cp *.js ./build
	cp metadata.json ./build
	cp stylesheet.css ./build
	cp -r ui ./build
	cp -r preferences ./build
	cp -r effects ./build
	cp -r apps ./build
	cp README.md ./build
	cp CHANGELOG.md ./build
	cp -R schemas ./build
	rm -rf ./build/_*.js
	rm -rf ./build/utils.js
	rm -rf ./build/drawing.js
	rm -rf ./build/chamfer.js
	rm -rf ./build/imports_*
	rm -rf ./*.zip
	cd build ; \
	zip -qr ../search-light@icedman.github.com.zip .

install-zip: publish
	echo "installing zip..."
	rm -rf ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com
	mkdir -p ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/
	unzip -q search-light@icedman.github.com.zip -d ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/

g44: build
	rm -rf ./build
	mkdir -p ./build
	mkdir -p ./build/apps
	mkdir -p ./build/preferences
	python3 ./transpile.py
	rm -rf ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/
	mkdir -p ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/
	cp -R ./schemas ./build
	cp -R ./ui ./build
	cp ./apps/*.desktop ./build/apps
	# cp ./effects/*.glsl ./build/effects
	cp ./LICENSE* ./build
	cp ./CHANGELOG* ./build
	cp ./README* ./build
	cp ./stylesheet.css ./build
	cp -r ./build/* ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/

publish-g44: g44
	echo "publishing..."
	cd build ; \
	zip -qr ../search-light@icedman.github.com.zip .

test-prefs-g44: g44
	gnome-extensions prefs search-light@icedman.github.com

test-shell-g44: g44
	env GNOME_SHELL_SLOWDOWN_FACTOR=2 \
		MUTTER_DEBUG_DUMMY_MODE_SPECS=1200x800 \
	 	MUTTER_DEBUG_DUMMY_MONITOR_SCALES=1 \
		dbus-run-session -- gnome-shell --nested --wayland
	rm /run/user/1000/gnome-shell-disable-extensions

test-prefs:
	gnome-extensions prefs search-light@icedman.github.com

test-shell: install
	env GNOME_SHELL_SLOWDOWN_FACTOR=1 \
		MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x800 \
	 	MUTTER_DEBUG_DUMMY_MONITOR_SCALES=1.5 \
		dbus-run-session -- gnome-shell --nested --wayland
	rm /run/user/1000/gnome-shell-disable-extensions

lint:
	eslint ./

xml-lint:
	cd ui ; \
	find . -name "*.ui" -type f -exec xmllint --output '{}' --format '{}' \;

pretty: xml-lint
	rm -rf ./build/*
	prettier --single-quote --write "**/*.js"
