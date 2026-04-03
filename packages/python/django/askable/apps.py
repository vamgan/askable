from django.apps import AppConfig


class AskableConfig(AppConfig):
    name = "askable"
    label = "askable"
    verbose_name = "Askable"

    def ready(self) -> None:
        pass  # reserved for future signal registration
