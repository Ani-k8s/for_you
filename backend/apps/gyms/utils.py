from gyms.models import GymFeatureConfig, Gym

def get_gym_config(gym: Gym | None = None) -> GymFeatureConfig:
    """
    Returns the specific config for a gym.
    Raises ValueError if config is missing or gym is not provided.
    """
    if not gym:
        raise ValueError("Configuration not set. No gym provided.")
    
    config = GymFeatureConfig.objects.filter(gym=gym).first()
    if not config:
        raise ValueError("Configuration not set for this gym. Please configure features.")
    
    return config
