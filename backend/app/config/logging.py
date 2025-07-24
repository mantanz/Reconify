import logging


def configure_logging():
    """
    Configure logging for the application.
    Sets up both file and console logging with appropriate formatting.
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('reconify.log'),
            logging.StreamHandler()
        ]
    )


# Initialize logging when this module is imported
configure_logging() 